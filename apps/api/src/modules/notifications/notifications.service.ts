import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Complaint, NotificationType, Role } from '@prisma/client';
import { FULL_ACCESS_ROLES, hasFullAccess } from '../../common/auth/role.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../prisma/prisma.service';
import { ListNotificationQueryDto } from './dto/list-notification-query.dto';
import { NotificationEntity } from './entities/notification.entity';

const STATUS_LABEL: Record<string, string> = {
  diterima: 'Diterima',
  diproses: 'Diproses',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
};

/**
 * Notifikasi in-app (D9, 2026-08-05, cakupan disepakati user): awalnya HANYA
 * 2 event -- status pengaduan berubah, dan balasan baru pada pengaduan.
 * Bukan sistem event generik utk seluruh aplikasi (jangan diperluas sendiri
 * di luar yg disepakati). Baris per-penerima disimpan langsung (bukan
 * event+fanout terpisah) -- skala pemakaian tak butuh itu.
 *
 * REVISI (2026-08-06, laporan bug user "notifikasi tak pernah muncul di
 * admin opd/kabupaten"):
 * - `complaint_created` (event ke-3, BARU): SEBELUMNYA pengaduan baru masuk
 *   TIDAK memicu notifikasi sama sekali (keputusan lama D9) -- OPD baru sadar
 *   ada tiket lewat balasan susulan, yg sering telat. Kini Admin OPD tujuan
 *   diberi tahu segera saat pengaduan baru masuk.
 * - **Kabupaten (= superuser, akses penuh) SEBELUMNYA tidak pernah jadi
 *   penerima notifikasi utk event APA PUN** -- gap struktural, bukan
 *   keputusan sengaja (kemungkinan luput sebelum peran superuser digabung ke
 *   kabupaten). Kini kabupaten diberi tahu utk KETIGA event, utk SEMUA
 *   pengaduan (bukan cuma yg dia tangani sendiri) via `notifyKabupaten`,
 *   sesuai perannya yg mengawasi seluruh OPD -- kecuali dia sendiri pelaku
 *   aksinya (dikecualikan via `excludeUserId`, sekarang kabupaten juga bisa
 *   ubah status/balas lewat halaman admin-kab).
 *
 * Setiap method `notify*` SENGAJA menelan errornya sendiri (log lalu lanjut)
 * -- notifikasi adalah efek samping, gagal membuatnya TIDAK BOLEH
 * menggagalkan aksi utama (ubah status/kirim balasan), sama semangatnya dgn
 * AuditInterceptor yg juga toleran thd kegagalan pencatatan.
 */
/**
 * Jumlah jawaban yang memicu notifikasi survei. Sesudah 100, hanya kelipatan
 * 100 -- survei bertarget ratusan responden tak boleh membanjiri lonceng
 * kabupaten & superuser, yang juga menerima notifikasi pengaduan.
 */
const TONGGAK_AWAL: readonly number[] = [1, 10, 25, 50];

const adalahTonggak = (jumlah: number): boolean =>
  jumlah > 0 && (TONGGAK_AWAL.includes(jumlah) || jumlah % 100 === 0);

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Pengaduan baru masuk -> beri tahu Admin OPD tujuan + kabupaten (oversight). Pelapor TIDAK diberi tahu (dia sendiri pelakunya). */
  async notifyComplaintCreated(complaint: Complaint): Promise<void> {
    // Pengaduan "belum bertujuan" (6 September 2026) tak punya OPD untuk
    // diberi tahu. Meneruskan `null` ke notifyRole bukan sekadar sia-sia: ia
    // akan mencari akun ber-`opdId: null` -- yaitu Admin Kabupaten & warga --
    // dan mengabari mereka bahwa ada tiket "masuk ke OPD Anda".
    if (complaint.opdId != null) {
      await this.notifyRole(
        Role.opd,
        complaint.opdId,
        NotificationType.complaint_created,
        'Pengaduan Baru Masuk',
        `Pengaduan baru ${complaint.ticketNo} masuk ke OPD Anda`,
        `/admin-opd/complaints/${complaint.ticketNo}`,
      );
    }
    await this.notifyKabupaten(
      complaint.userId,
      NotificationType.complaint_created,
      'Pengaduan Baru Masuk',
      `Pengaduan baru ${complaint.ticketNo} masuk`,
      `/admin-kab/complaints/${complaint.ticketNo}`,
    );
  }

  /** Pengaduan berpindah status -> beri tahu pelapor (responden pemilik) + kabupaten (oversight). */
  async notifyComplaintStatusChanged(complaint: Complaint, actorUserId: number): Promise<void> {
    const label = STATUS_LABEL[complaint.status] ?? complaint.status;
    await this.safeCreate({
      userId: complaint.userId,
      untukPeran: Role.responden,
      type: NotificationType.complaint_status_changed,
      title: 'Status Pengaduan Diperbarui',
      message: `Pengaduan ${complaint.ticketNo} kini berstatus "${label}"`,
      link: `/complaints/${complaint.ticketNo}`,
    });
    await this.notifyKabupaten(
      actorUserId,
      NotificationType.complaint_status_changed,
      'Status Pengaduan Diperbarui',
      `Pengaduan ${complaint.ticketNo} kini berstatus "${label}"`,
      `/admin-kab/complaints/${complaint.ticketNo}`,
    );
  }

  /**
   * Balasan baru -> beri tahu PIHAK LAIN dari yang membalas + kabupaten
   * (oversight). Responden membalas -> semua Admin OPD pemilik (bisa >1
   * akun per OPD) diberi tahu. Admin OPD/Kabupaten membalas -> pelapor
   * diberi tahu.
   *
   * ARAHNYA DITENTUKAN PERAN YANG SEDANG DIPAKAI, BUKAN ID PENULIS (22
   * September 2026, laporan pengguna: "notifikasi balasan tidak muncul" pada
   * akun ber-3 peran). Sebelumnya di sini berdiri
   * `replyAuthorUserId === complaint.userId`. Pada akun yang memegang beberapa
   * peran, pelapor dan petugas yang menanganinya adalah orang yang sama,
   * sehingga syarat itu selalu benar: balasan petugas digolongkan sebagai
   * balasan pelapor, dan kotak masuk `responden` tak pernah menerima apa pun.
   * Terukur pada basis data pengembangan -- balasan sebagai admin dan sebagai
   * warga pada tiket yang sama melahirkan notifikasi yang identik.
   *
   * Komentar pada `ComplaintReply.dariPelapor` di schema.prisma sudah menyatakan
   * arah ini "tidak dapat diturunkan dari author_id", dan `createReply` memang
   * sudah menyimpannya dengan benar. Yang kurang hanya meneruskannya ke sini.
   *
   * KOTAK MASUK MILIK PERAN, BUKAN MILIK ORANG. Penerima yang kebetulan
   * penulisnya sendiri TETAP dikabari selama itu kotak peran yang lain: ia
   * menulis sebagai petugas, dan kotak wargannya tak akan dilihatnya sampai ia
   * berpindah peran. Yang dikecualikan hanya kotak peran yang barusan dipakai
   * -- di sana ia memang sudah tahu.
   */
  async notifyComplaintReply(
    complaint: Complaint,
    penulis: Pick<CurrentUser, 'userId' | 'actingRole'>,
  ): Promise<void> {
    if (penulis.actingRole === Role.responden) {
      // `opdId != null`: pengaduan yang belum bertujuan (6 September 2026)
      // tak punya OPD untuk dikabari. Pelapornya TIDAK kehilangan perhatian --
      // notifyKabupaten di akhir metode ini tetap berjalan, dan Superuser
      // beserta Admin Kabupaten justru pihak yang bertugas menriasenya.
      if (complaint.opdId != null) {
        await this.notifyRole(
          Role.opd,
          complaint.opdId,
          NotificationType.complaint_reply,
          'Balasan Baru pada Pengaduan',
          `Ada balasan baru dari pelapor pada pengaduan ${complaint.ticketNo}`,
          `/admin-opd/complaints/${complaint.ticketNo}`,
        );
      }
    } else {
      await this.safeCreate({
        userId: complaint.userId,
        untukPeran: Role.responden,
        type: NotificationType.complaint_reply,
        title: 'Balasan Baru pada Pengaduan',
        message: `OPD membalas pengaduan ${complaint.ticketNo} Anda`,
        link: `/complaints/${complaint.ticketNo}`,
      });
    }

    // Pengecualiannya mengikuti PERAN yang dipakai, bukan orangnya. Penulis
    // yang barusan bertindak sebagai petugas OPD tetap perlu melihatnya di
    // kotak kabupatennya: itu meja lain dengan tugas lain, yaitu mengawasi.
    await this.notifyKabupaten(
      hasFullAccess(penulis.actingRole) ? penulis.userId : null,
      NotificationType.complaint_reply,
      'Balasan Baru pada Pengaduan',
      `Ada balasan baru pada pengaduan ${complaint.ticketNo}`,
      `/admin-kab/complaints/${complaint.ticketNo}`,
    );
  }

  /**
   * Jawaban survei masuk -> beri tahu Admin OPD pemilik survei + kabupaten
   * (oversight). Pengisinya sendiri tak diberi tahu.
   *
   * Jumlahnya dihitung DI SINI, bukan diterima dari pemanggil: kegagalan
   * kueri hitung pun harus ditelan seperti kegagalan notifikasi lainnya, dan
   * itu hanya terjamin kalau kueri itu berada di dalam kelas ini.
   *
   * Pesannya TAK PERNAH menyebut siapa pengisinya. Survei boleh diisi anonim,
   * dan identitas responden IKM memang bukan hal yang perlu diketahui admin.
   */
  async notifySurveyResponse(
    survey: { id: number; judul: string; opdId: number },
    pengisiUserId: number | null,
  ): Promise<void> {
    let jumlah: number;
    try {
      jumlah = await this.prisma.surveyResponse.count({ where: { surveyId: survey.id } });
    } catch (err) {
      this.logger.warn(`Gagal menghitung jawaban survei #${survey.id}: ${String(err)}`);
      return;
    }
    if (!adalahTonggak(jumlah)) return;

    const pertama = jumlah === 1;
    const title = pertama ? 'Survei Mulai Menerima Jawaban' : 'Jawaban Survei Bertambah';
    const message = pertama
      ? `Survei "${survey.judul}" menerima jawaban pertama`
      : `Survei "${survey.judul}" telah menerima ${jumlah} jawaban`;

    await this.notifyRole(
      Role.opd,
      survey.opdId,
      NotificationType.survey_response_created,
      title,
      message,
      `/admin-opd/surveys/${survey.id}/responses`,
    );
    await this.notifyKabupaten(
      pengisiUserId,
      NotificationType.survey_response_created,
      title,
      message,
      `/admin-kab/surveys/${survey.id}/responses`,
    );
  }

  /**
   * Broadcast ke semua akun aktif berperan `role` (opsional terikat `opdId`).
   * Query pencarian penerima DIBUNGKUS try/catch di sini juga (2026-08-06) --
   * SEBELUMNYA cuma `safeCreate` (baris DB per-notifikasi) yg aman, TAPI
   * `prisma.user.findMany` di atasnya tak dijaga -- kalau query itu gagal
   * (mis. DB hiccup), error bocor ke pemanggil (`create`/`updateStatus`/
   * `addReply`) dan bisa salah dikira aksi UTAMA gagal, padahal cuma efek
   * samping notifikasi. Sekarang konsisten dgn kontrak dokumentasi kelas ini.
   */
  private async notifyRole(
    role: Role,
    opdId: number,
    type: NotificationType,
    title: string,
    message: string,
    link: string,
  ): Promise<void> {
    try {
      const recipients = await this.prisma.user.findMany({
        // `roles: { has }` (5 September 2026): pemberitahuan menyasar
        // KEPEMILIKAN role, bukan peran yang sedang dipakai seseorang --
        // penerimanya belum tentu sedang membuka aplikasi sama sekali.
        where: { roles: { has: role }, opdId, isActive: true },
        select: { id: true },
      });
      await Promise.all(
        recipients.map((r) =>
          this.safeCreate({ userId: r.id, untukPeran: role, type, title, message, link }),
        ),
      );
    } catch (err) {
      this.logger.warn(`Gagal mencari penerima notifikasi role=${role}: ${String(err)}`);
    }
  }

  /**
   * Broadcast ke semua Admin Kabupaten aktif, kecuali pelaku aksi itu sendiri.
   *
   * `null` berarti pelakunya tak punya baris `users` sama sekali -- pengisi
   * survei tanpa sesi (13 September 2026). Klausa `id` lalu DIHILANGKAN, bukan
   * diisi id semu: `{ not: <id palsu> }` diam-diam mengecualikan akun sungguhan
   * yang kebetulan bernomor itu.
   */
  private async notifyKabupaten(
    excludeUserId: number | null,
    type: NotificationType,
    title: string,
    message: string,
    link: string,
  ): Promise<void> {
    try {
      // Superuser ikut menerima (2026-08-20): ia mewarisi seluruh hak kabupaten,
      // jadi tak masuk akal kalau justru tak diberi tahu perkara yang sama.
      const kabupatenUsers = await this.prisma.user.findMany({
        where: {
          roles: { hasSome: [...FULL_ACCESS_ROLES] },
          isActive: true,
          ...(excludeUserId === null ? {} : { id: { not: excludeUserId } }),
        },
        select: { id: true },
      });
      await Promise.all(
        kabupatenUsers.map((k) =>
          this.safeCreate({
            userId: k.id,
            untukPeran: Role.kabupaten,
            type,
            title,
            message,
            link,
          }),
        ),
      );
    } catch (err) {
      this.logger.warn(`Gagal mencari penerima notifikasi kabupaten: ${String(err)}`);
    }
  }

  /**
   * Daftar notifikasi milik pengguna saat ini. Terbaru dulu KECUALI diminta
   * lain (13 September 2026).
   *
   * `where` yang sama dipakai `findMany` DAN `count`, jadi `meta.pagination
   * .total` selalu menggambarkan kumpulan yang sedang disaring. Halaman riwayat
   * membaca angka itu untuk pil "Semua"/"Belum dibaca"; total yang tak ikut
   * menyaring akan membuat pilnya menyebut angka yang tak ada hubungannya
   * dengan daftar di bawahnya.
   *
   * Rentang waktunya ditopang `@@index([userId, createdAt])` yang memang sudah
   * ada di schema, jadi tak ada indeks baru yang perlu ditambahkan.
   */
  async findMine(
    query: ListNotificationQueryDto,
    user: CurrentUser,
  ): Promise<PaginatedResult<NotificationEntity>> {
    const { page, limit, unreadOnly, sort, from, to } = query;

    const rentang = {
      ...(from ? { gte: new Date(from) } : {}),
      ...(to ? { lte: new Date(to) } : {}),
    };
    const where = {
      userId: user.userId,
      // Peran yang SEDANG DIPAKAI, bukan seluruh milik akun. Lihat catatan
      // kelas di atas: tanpa ini kotak masuk akun berperan jamak bercampur.
      untukPeran: user.actingRole,
      ...(unreadOnly ? { isRead: false } : {}),
      ...(Object.keys(rentang).length > 0 ? { createdAt: rentang } : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: sort ?? 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    return paginate(
      rows.map((row) => new NotificationEntity(row)),
      total,
      page,
      limit,
    );
  }

  async countUnread(user: CurrentUser): Promise<number> {
    return this.prisma.notification.count({
      where: { userId: user.userId, isRead: false, untukPeran: user.actingRole },
    });
  }

  /** Tandai satu notifikasi dibaca. `findFirst` gabungan id+userId -- 404 baik saat tak ada maupun bukan milik (privasi, bukan enumerable). */
  async markAsRead(id: number, user: CurrentUser): Promise<NotificationEntity> {
    const existing = await this.prisma.notification.findFirst({
      where: { id, userId: user.userId },
    });
    if (!existing) {
      throw new NotFoundException(`Notifikasi dengan id ${id} tidak ditemukan`);
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
    return new NotificationEntity(updated);
  }

  async markAllAsRead(user: CurrentUser): Promise<{ updated: number }> {
    /**
     * Hanya peran yang sedang dipakai. Menandai lintas-peran akan membungkam
     * notifikasi yang JUSTRU disembunyikan dari sesi ini, sehingga pemiliknya
     * tak pernah punya kesempatan membacanya.
     */
    const result = await this.prisma.notification.updateMany({
      where: { userId: user.userId, isRead: false, untukPeran: user.actingRole },
      data: { isRead: true },
    });
    return { updated: result.count };
  }

  private async safeCreate(data: {
    userId: number;
    /**
     * Peran TUJUAN, wajib. Dibuat wajib dengan sengaja: pemanggil baru yang
     * lupa mengisinya akan ditolak kompilator, bukan diam-diam menulis baris
     * yang tak pernah terlihat siapa pun karena tak cocok dengan peran mana pun.
     */
    untukPeran: Role;
    type: NotificationType;
    title: string;
    message: string;
    link: string;
  }): Promise<void> {
    try {
      await this.prisma.notification.create({ data });
    } catch (err) {
      this.logger.warn(`Gagal membuat notifikasi utk user #${data.userId}: ${String(err)}`);
    }
  }
}
