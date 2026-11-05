import { randomUUID } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  BATAS_HARIAN_PENGADUAN_BAKU,
  BATAS_HARIAN_TERCAPAI,
  BATAS_UKURAN_LAMPIRAN_BYTES,
  BATAS_UKURAN_LAMPIRAN_LABEL,
} from './complaints.constants';
import {
  Complaint,
  ComplaintAttachment,
  ComplaintReply,
  ComplaintStatus,
  ComplaintStatusHistory,
  Prisma,
  Role,
  TingkatPengaduan,
} from '@prisma/client';
import { enkripsi, INFO_LAMPIRAN } from '../../common/crypto/envelope';
import { dekripsiKolom, enkripsiKolom } from '../../common/crypto/kolom';
import { samarkanNik } from '../../common/identitas/nik';
import { kunciData } from '../../common/crypto/kunci';
import { assertOpdAccess } from '../../common/auth/opd-scope.util';
import { hasFullAccess } from '../../common/auth/role.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginatedResult, paginate } from '../../common/dto/paginated-result';
import { PrismaService } from '../../prisma/prisma.service';
import { ConsentService } from '../auth/consent.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { CreateComplaintDto } from './dto/create-complaint.dto';
import { ForwardComplaintDto } from './dto/forward-complaint.dto';
import { AlihkanComplaintDto } from './dto/alihkan-complaint.dto';
import { CreateReplyDto } from './dto/create-reply.dto';
import { ListComplaintQueryDto } from './dto/list-complaint-query.dto';
import { UpdateComplaintStatusDto } from './dto/update-complaint-status.dto';
import { signAttachmentPath } from './attachment-url.util';
import { parseTanggalKejadian } from './tanggal-kejadian.util';
import {
  labelStatus,
  STATUS_BOLEH_DIALIHKAN,
  STATUS_WAJIB_CATATAN,
  TRANSISI_DIIZINKAN,
} from './alur-status.util';
import { ComplaintStatusHistoryEntity } from './entities/complaint-status-history.entity';
import { assertKategoriSesuaiTingkat, assertOpdSesuaiTingkat } from './tingkat-pengaduan.util';
import { tingkatOpd } from '../opd/tingkat-opd.util';
import { assertAllowedContent, safeFilename } from './attachment.util';
import { ComplaintEntity } from './entities/complaint.entity';
import { ComplaintReplyEntity } from './entities/complaint-reply.entity';

/**
 * Transisi status, status wajib-catatan, dan labelnya kini tinggal di
 * `alur-status.util.ts` (4 November 2026) -- lihat docblock berkas itu untuk
 * sebabnya. Tabel `ALLOWED_TRANSITIONS` yang dulu berdiri di sini dibuang
 * bersama alur empat status.
 *
 * CATATAN PERPINDAHAN TIDAK LAGI DISALIN MENJADI BALASAN PERCAKAPAN. Sampai
 * 4 November 2026, alasan penolakan ditulis sebagai `complaint_reply` supaya
 * pelapor dapat membacanya; sejak riwayat status punya kolom `catatan`
 * sendiri, menulisnya ke dua tempat membuat halaman detail menampilkan
 * kalimat yang sama dua kali -- sekali di linimasa, sekali di percakapan.
 * Tak ada keterangan yang hilang: keduanya tergambar di halaman yang sama.
 */

// Satu sumber dengan langit-langit multer (complaints.constants.ts).
const MAX_FILE_SIZE_BYTES = BATAS_UKURAN_LAMPIRAN_BYTES;
const MAX_FILES = 5;

interface SavedFile {
  fileUrl: string;
  mimeType: string;
  sizeBytes: number;
  absolutePath: string;
}

type ComplaintWithAttachments = Complaint & {
  attachments: {
    id: number;
    fileUrl: string;
    mimeType: string | null;
    sizeBytes: number | null;
    createdAt: Date;
  }[];
  /**
   * Hanya terisi bila query di-`include`. `findAll` memilih `nama` saja;
   * `findByTicketNo` memilih ketiga kolom identitas juga (1 Oktober 2026),
   * sehingga ketiganya OPSIONAL di sini -- bukan kelalaian melainkan
   * pernyataan bahwa daftar memang tak menariknya.
   */
  user?: { nama: string; nik?: string | null; nomorHp?: string | null; alamat?: string | null };
  /**
   * Hanya terisi bila query di-`include` (lihat findByTicketNo, INT-18).
   * `null` bila pengaduannya belum bertujuan (6 September 2026) -- relasinya
   * memang tak ada, bukan tak ikut di-include.
   */
  opd?: { nama: string } | null;
  /**
   * Hanya terisi bila query di-`include` (lihat `findByTicketNo`). `undefined`
   * berarti kuerinya memang tak menariknya -- bukan "pengaduan ini tak punya
   * riwayat", yang mustahil sejak baris `terkirim` ditulis bersama barisnya.
   */
  statusHistory?: (ComplaintStatusHistory & {
    actor: { nama: string } | null;
    opdTujuan: { nama: string } | null;
  })[];
};

@Injectable()
export class ComplaintsService {
  private readonly logger = new Logger(ComplaintsService.name);
  private readonly uploadDir: string;
  // Rahasia & masa berlaku URL lampiran bertanda tangan (T1, 7 September 2026).
  // Diambil sekali di konstruktor: ia dipakai pada SETIAP baris lampiran di
  // setiap respons, jadi membaca ConfigService per baris hanya kerja berulang.
  private readonly urlSecret: string;
  private readonly urlTtl: number;
  private readonly batasHarianPengaduan: number;
  /**
   * Kunci induk enkripsi at-rest (23 September 2026). Diambil sekali di
   * konstruktor dengan alasan yang sama seperti `urlSecret` di atas, dan dengan
   * satu alasan tambahan: bila kuncinya belum disetel, `kunciData` melempar
   * SAAT MODUL DIBANGUN, bukan saat warga pertama menekan tombol kirim.
   */
  private readonly kunci: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    config: ConfigService,
    private readonly consent: ConsentService,
    private readonly audit: AuditService,
  ) {
    this.uploadDir = path.resolve(process.cwd(), config.get<string>('upload.dir') ?? 'uploads');
    // `SESSION_JWT_SECRET` sudah WAJIB & minimal 32 karakter (env.validation),
    // jadi tak ada cadangan lemah di sini -- kalau ia kosong, aplikasi bahkan
    // tak sampai boot. Kuncinya diturunkan lagi di attachment-url.util.ts
    // (pemisahan domain), jadi rahasia ini tak dipakai apa adanya.
    this.urlSecret = config.get<string>('session.jwtSecret') ?? '';
    this.urlTtl = config.get<number>('upload.signedUrlTtlSeconds') ?? 3600;
    this.batasHarianPengaduan =
      config.get<number>('complaint.batasHarian') ?? BATAS_HARIAN_PENGADUAN_BAKU;
    this.kunci = kunciData(config);
  }

  /**
   * Tanda tangani `fileUrl` setiap lampiran, tepat saat ia keluar sebagai
   * respons (T1, 7 September 2026).
   *
   * DI SINI, bukan disimpan ke DB: tanda tangannya berbatas waktu, jadi ia harus
   * dibuat ulang setiap permintaan. `file_url` di basis data tetap jalur bersih
   * -- itu pula yang membuat kontrak DB tak berubah dan pemindahan ke S3 nanti
   * tetap terbuka.
   *
   * Dipanggil dari DUA tempat (toEntity & toReplyEntity). Kalau kelak ada tempat
   * ketiga yang lupa memanggilnya, akibatnya adalah gambar yang GAGAL dimuat
   * (403 dari penjaga), bukan lampiran yang bocor -- gagal ke arah aman, dan
   * terlihat seketika.
   */
  private tandaTanganiLampiran<T extends { fileUrl: string }>(rows: T[], sub: number): T[] {
    return rows.map((a) => ({
      ...a,
      fileUrl: signAttachmentPath(a.fileUrl, this.urlSecret, this.urlTtl, sub),
    }));
  }

  /** Ajukan pengaduan baru (Responden). Lampiran divalidasi lalu disimpan SEBELUM baris DB dibuat. */
  async create(
    dto: CreateComplaintDto,
    files: Express.Multer.File[] | undefined,
    user: CurrentUser,
  ): Promise<ComplaintEntity> {
    // PALING AWAL, sebelum validasi & sebelum lampiran ditulis ke disk (celah 2,
    // 2026-08-27): menulis berkas lalu menolak akan meninggalkan lampiran tanpa induk
    // untuk pengaduan yang tak pernah ada.
    await this.consent.assertConsented(user);

    // Sebelum lampiran ditulis, dengan alasan yang sama seperti di atas.
    await this.assertBelumMelewatiBatasHarian(user.userId);

    // Pemisahan tingkat (4 November 2026). SEBELUM lampiran ditulis ke disk,
    // alasan yang sama seperti kedua penjaga di atas. Dua pemeriksaan murni
    // (tanpa kueri) didahulukan supaya penolakan yang paling sering -- salah
    // kategori -- tak perlu memukul basis data sama sekali.
    assertKategoriSesuaiTingkat(dto.kategori, dto.tingkat);
    const tanggalKejadian = parseTanggalKejadian(dto.tanggalKejadian);

    // Hanya bila tujuannya disertakan. Pengaduan "belum tahu tujuannya"
    // (6 September 2026) sengaja tak punya OPD untuk diperiksa; memanggil
    // pemeriksaan itu dengan undefined berarti mencari OPD ber-id undefined.
    if (dto.opdId != null) {
      await this.assertOpdExists(dto.opdId, dto.tingkat);
    }
    const validFiles = this.validateFiles(files);
    const saved = await this.persistFiles(validFiles);

    let complaint: ComplaintWithAttachments;
    try {
      complaint = await this.insertWithUniqueTicket(dto, tanggalKejadian, user.userId, saved);
    } catch (err) {
      // DB gagal setelah file tersimpan → bersihkan file tanpa induk (best-effort).
      await this.cleanupFiles(saved);
      throw err;
    }
    // DI LUAR try/catch DI ATAS (2026-08-06) -- SEBELUMNYA notify dipanggil DI
    // DALAM blok yg sama, jadi kalau notifikasi gagal (efek samping), file
    // lampiran yg SUDAH SAH tersimpan & tertaut ke baris DB yg SUDAH SAH
    // ter-commit ikut terhapus (cleanupFiles), padahal pengaduannya sendiri
    // berhasil dibuat -- caller salah dikira gagal total.
    await this.notificationsService.notifyComplaintCreated(complaint);
    return this.toEntity(complaint, user.userId);
  }

  /**
   * Daftar pengaduan — terfilter kepemilikan (Responden: milik sendiri; OPD:
   * OPD-nya; Kabupaten: semua). Sertakan `opdNama` (INT-18) selain
   * `reporterNama` (INT-11) -- daftar pengaduan responden perlu kolom "OPD
   * Tujuan" per baris.
   */
  async findAll(
    query: ListComplaintQueryDto,
    user: CurrentUser,
  ): Promise<PaginatedResult<ComplaintEntity>> {
    const { page, limit, status, opdId, tanpaOpd } = query;
    const where: Prisma.ComplaintWhereInput = { ...this.ownershipWhere(user) };
    if (status) {
      where.status = status;
    }
    // AND, bukan menimpa penyaring kepemilikan -- lihat catatan yang sama di
    // SurveysService.findAll. Kedua filter ini hanya boleh MEMPERSEMPIT.
    const penyaring: Prisma.ComplaintWhereInput[] = [];
    if (opdId != null) {
      penyaring.push({ opdId });
    }
    if (tanpaOpd) {
      // Kotak masuk triase: pengaduan yang pengirimnya tak tahu tujuannya.
      penyaring.push({ opdId: null });
    }
    if (penyaring.length > 0) {
      where.AND = penyaring;
    }

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.complaint.findMany({
        where,
        include: {
          attachments: true,
          user: { select: { nama: true } },
          opd: { select: { nama: true } },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.complaint.count({ where }),
    ]);

    return paginate(
      rows.map((row) => this.toEntity(row, user.userId)),
      total,
      page,
      limit,
    );
  }

  /**
   * Detail & lacak status via nomor tiket (identifier publik). Sertakan
   * `opdNama` (INT-18) -- halaman detail pengaduan responden perlu tahu
   * "ditujukan ke OPD mana", sebelumnya endpoint ini tak sertakan sama sekali.
   * Sertakan juga `reporterNama` (INT-20) -- halaman detail Admin OPD perlu
   * profil pelapor, endpoint ini sebelumnya cuma include `opd`, bukan `user`,
   * jadi reporterNama selalu kosong meski findAll sudah menyertakannya.
   */
  async findByTicketNo(ticketNo: string, user: CurrentUser): Promise<ComplaintEntity> {
    const complaint = await this.prisma.complaint.findUnique({
      where: { ticketNo },
      include: {
        attachments: true,
        // Ketiga kolom identitas IKUT DI SINI SAJA, tidak di findAll. Lihat
        // ComplaintEntity.reporterNik untuk sebabnya.
        user: { select: { nama: true, nik: true, nomorHp: true, alamat: true } },
        opd: { select: { nama: true } },
        // DI SINI SAJA, tidak di `findAll`: daftar pengaduan tak menggambar
        // linimasa, dan menariknya per baris berarti seratus riwayat ikut
        // terkirim demi kolom yang tak satu pun dipakai. Alasan yang sama
        // dengan ketiga kolom identitas di atas.
        //
        // `nama` pelakunya ikut, bukan hanya id: tampilan menulis siapa yang
        // memindahkan, dan id angka tak berarti apa-apa bagi pembacanya.
        statusHistory: {
          include: {
            actor: { select: { nama: true } },
            // Nama instansi tujuan pengalihan. Dibaca di sini, bukan
            // diterjemahkan di klien: halaman detail pelapor tak punya daftar
            // OPD untuk memetakan idnya.
            opdTujuan: { select: { nama: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!complaint) {
      throw new NotFoundException(`Pengaduan dengan nomor tiket ${ticketNo} tidak ditemukan`);
    }
    this.assertAccess(user, complaint);
    return this.toEntity(complaint, user.userId);
  }

  /** Ubah status pengaduan (Admin OPD pemilik). Ditolak WAJIB disertai catatan/alasan. */
  async updateStatus(
    id: number,
    dto: UpdateComplaintStatusDto,
    user: CurrentUser,
  ): Promise<ComplaintEntity> {
    const complaint = await this.getByIdOrThrow(id);
    // Urutannya sengaja: penolakan PERAN lebih dulu (Admin OPD & warga tak
    // berhak menyentuh tiket yang belum bertujuan sama sekali), baru penolakan
    // KEADAAN. Dibalik, akun tak berhak akan tahu bahwa tiket itu ada.
    assertOpdAccess(user, complaint.opdId);
    if (complaint.opdId == null) {
      throw new BadRequestException(
        'Pengaduan ini belum diteruskan ke OPD mana pun. Teruskan ke OPD yang berwenang lebih dahulu.',
      );
    }

    if (!TRANSISI_DIIZINKAN[complaint.status].includes(dto.status)) {
      throw new BadRequestException(
        `Transisi status ${labelStatus(complaint.status)} → ${labelStatus(dto.status)} tidak diizinkan`,
      );
    }
    if (STATUS_WAJIB_CATATAN.includes(dto.status) && !dto.catatan) {
      // Kalimatnya menyebut status yang dimaksud, bukan "catatan wajib diisi"
      // saja: dua status menuntutnya dengan alasan berbeda, dan petugas perlu
      // tahu APA yang harus ia tuliskan.
      throw new BadRequestException(
        `Catatan wajib diisi untuk status "${labelStatus(dto.status)}" — pelapor perlu tahu alasannya`,
      );
    }

    const [updated] = await this.prisma.$transaction([
      this.prisma.complaint.update({
        where: { id },
        data: { status: dto.status },
        include: { attachments: true },
      }),
      // Satu baris riwayat per perpindahan. DI DALAM transaksi yang sama
      // dengan perubahan statusnya: riwayat yang kehilangan satu baris karena
      // penulisan kedua gagal akan memperlihatkan tiket yang melompati tahap,
      // dan tak ada cara memulihkannya dari data yang tersisa.
      this.prisma.complaintStatusHistory.create({
        data: {
          complaintId: id,
          status: dto.status,
          // Diperlakukan sama dengan `complaint_replies.pesan` -- teks bebas
          // petugas tentang kasus seorang warga.
          catatan: dto.catatan ? enkripsiKolom(dto.catatan, this.kunci) : null,
          actorId: user.userId,
        },
      }),
    ]);
    await this.notificationsService.notifyComplaintStatusChanged(updated, user.userId);
    return this.toEntity(updated as ComplaintWithAttachments, user.userId);
  }

  /** Riwayat tanggapan pada satu tiket. */
  async listReplies(complaintId: number, user: CurrentUser): Promise<ComplaintReplyEntity[]> {
    const complaint = await this.getByIdOrThrow(complaintId);
    this.assertAccess(user, complaint);

    const rows = await this.prisma.complaintReply.findMany({
      where: { complaintId },
      include: { attachments: true },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map((row) => this.toReplyEntity(row, complaint, user.userId));
  }

  /**
   * Tambah tanggapan (Admin OPD pemilik atau Responden pengaju). Lampiran
   * opsional (2026-08-06, laporan bug user "tidak bisa mengirim dokumen/foto
   * di chat") -- validasi/simpan file pakai helper yg sama dgn create()
   * (tipe & ukuran identik), `complaintId` dicatat eksplisit di setiap
   * lampiran (bukan diturunkan dari relasi replyId) supaya query
   * kepemilikan/akses tetap bisa lewat `complaint.attachments` tanpa join.
   *
   * `pesan` kini opsional (2026-08-06, laporan lanjutan: "kirim foto tanpa
   * teks tidak terkirim") -- balasan boleh lampiran saja, TAPI minimal salah
   * satu (pesan/lampiran) harus ada; dicek di sini (bukan class-validator,
   * yg tak tahu jumlah file) SEBELUM file ditulis ke disk (fail-fast, pola
   * sama assertOpdExists di create()). `pesan: String` di skema
   * tetap wajib-non-null (tanpa migrasi) -- disubstitusi string kosong.
   */
  async addReply(
    complaintId: number,
    dto: CreateReplyDto,
    files: Express.Multer.File[] | undefined,
    user: CurrentUser,
  ): Promise<ComplaintReplyEntity> {
    const complaint = await this.getByIdOrThrow(complaintId);
    this.assertAccess(user, complaint);

    if (!dto.pesan?.trim() && !(files && files.length > 0)) {
      throw new BadRequestException('Pesan atau lampiran wajib diisi');
    }

    const validFiles = this.validateFiles(files);
    const saved = await this.persistFiles(validFiles);

    try {
      const created = await this.prisma.complaintReply.create({
        data: {
          complaintId,
          authorId: user.userId,
          pesan: enkripsiKolom(dto.pesan ?? '', this.kunci),
          // Peran yang SEDANG DIPAKAI, bukan perbandingan id. Satu akun lazim
          // memegang beberapa peran sekaligus, sehingga akun pelapor yang
          // menangani pengaduannya sendiri memiliki `userId` yang sama persis
          // dengan pelapor -- perbandingan id menggolongkan balasan petugasnya
          // sebagai balasan pelapor, di kedua halaman sekaligus.
          dariPelapor: user.actingRole === Role.responden,
          attachments: {
            create: saved.map(({ fileUrl, mimeType, sizeBytes }) => ({
              complaintId,
              fileUrl,
              mimeType,
              sizeBytes,
            })),
          },
        },
        include: { attachments: true },
      });
      // `user` utuh, bukan `user.userId`: arah balasan ditentukan peran yang
      // sedang dipakai -- alasan yang sama persis dengan `dariPelapor` di atas.
      await this.notificationsService.notifyComplaintReply(complaint, user);
      return this.toReplyEntity(created, complaint, user.userId);
    } catch (err) {
      // DB gagal setelah file tersimpan → bersihkan file tanpa induk (best-effort, pola sama create()).
      await this.cleanupFiles(saved);
      throw err;
    }
  }

  /** Fragmen `where` sesuai kepemilikan data (dipakai findAll). */
  private ownershipWhere(user: CurrentUser): Prisma.ComplaintWhereInput {
    if (hasFullAccess(user.actingRole)) {
      return {};
    }
    if (user.actingRole === Role.opd) {
      if (user.opdId == null) {
        throw new ForbiddenException('Akun OPD tidak tertaut ke OPD mana pun');
      }
      return { opdId: user.opdId };
    }
    if (user.actingRole === Role.responden) {
      return { userId: user.userId };
    }
    throw new ForbiddenException('Peran tidak memiliki akses ke pengaduan');
  }

  /** Akses per-record: peran berakses penuh semua; OPD hanya OPD-nya; Responden hanya miliknya. */
  private assertAccess(
    user: CurrentUser,
    complaint: { userId: number; opdId: number | null },
  ): void {
    if (hasFullAccess(user.actingRole)) {
      return;
    }
    if (user.actingRole === Role.opd) {
      // `complaint.opdId == null` DIPERIKSA LEBIH DULU, dan itu keamanan bukan
      // kerapian tipe: akun `opd` yang `opdId`-nya juga null akan lolos lewat
      // `null === null` dan membaca pengaduan yang bukan haknya sama sekali.
      if (complaint.opdId != null && user.opdId === complaint.opdId) {
        return;
      }
      throw new ForbiddenException('Anda tidak memiliki akses ke pengaduan ini');
    }
    if (user.actingRole === Role.responden) {
      if (user.userId === complaint.userId) {
        return;
      }
      throw new ForbiddenException('Anda tidak memiliki akses ke pengaduan ini');
    }
    throw new ForbiddenException('Peran tidak memiliki akses ke pengaduan');
  }

  /**
   * `PATCH /complaints/:id/opd` -- meneruskan pengaduan yang belum bertujuan ke
   * OPD yang berwenang (permintaan pengguna 6 September 2026).
   *
   * HAK DITEGAKKAN DUA LAPIS sejak T6 (7 September 2026):
   * `@Roles(Role.kabupaten)` di controller menolak lebih dahulu,
   * dan pemeriksaan di bawah tetap ada sebagai lapis kedua. Dulu hanya ada lapis
   * ini, karena bypass menyeluruh membuat dekorator apa pun tak berlaku bagi
   * kedua peran itu.
   *
   * Hanya berlaku bila tujuannya MASIH kosong. Memindahkan tiket yang sudah
   * ditangani OPD lain adalah alur tersendiri yang belum diminta -- dan
   * membiarkannya di sini berarti riwayat penanganan berpindah tangan tanpa
   * jejak apa pun bagi OPD yang kehilangannya.
   */
  async forward(id: number, dto: ForwardComplaintDto, user: CurrentUser): Promise<ComplaintEntity> {
    const complaint = await this.getByIdOrThrow(id);

    if (!hasFullAccess(user.actingRole)) {
      throw new ForbiddenException('Hanya Admin Kabupaten yang dapat meneruskan pengaduan ke OPD');
    }
    if (complaint.opdId != null) {
      throw new BadRequestException(
        'Pengaduan ini sudah memiliki OPD tujuan, jadi tidak dapat diteruskan lagi',
      );
    }

    const opd = await this.prisma.opd.findUnique({ where: { id: dto.opdId } });
    if (!opd) {
      // 404, bukan 400: yang tak ditemukan adalah sumber daya yang ditunjuk
      // pemanggil, bukan bentuk permintaannya yang salah.
      throw new NotFoundException(`OPD dengan id ${dto.opdId} tidak ditemukan`);
    }

    const updated = await this.prisma.complaint.update({
      where: { id },
      data: { opdId: dto.opdId },
      include: { attachments: true },
    });

    // Tindakan administratif atas pengaduan orang lain -- harus berjejak.
    await this.audit.record(user.userId, 'forward', 'complaint', {
      complaintId: id,
      ticketNo: complaint.ticketNo,
      opdId: dto.opdId,
    });
    // Bagi OPD tujuan, inilah saat tiket itu benar-benar masuk. Tanpa ini ia tak
    // akan pernah tahu ada tanggung jawab baru -- persis keluhan 6 Agustus 2026.
    //
    // BUG-018 (23 Oktober 2026): baris ini dahulu memanggil
    // `notifyComplaintCreated`, yang memegang DUA penerima sekaligus, sehingga
    // Admin Kabupaten diberi tahu "Pengaduan Baru Masuk" untuk KEDUA kalinya
    // atas tiket yang sama -- dan pelaku penerusannya ikut mengabari dirinya
    // sendiri, sebab pengecualiannya menyasar pelapor, bukan pelaku. Yang
    // dibutuhkan di sini memang hanya bagian OPD-nya.
    await this.notificationsService.notifyOpdTujuan(updated);
    // DAN beri tahu PELAPOR bahwa pengaduan "Lainnya"-nya sudah mendarat di
    // instansi yang berwenang (7 Oktober 2026), berikut Admin Kabupaten LAIN
    // sebagai pengawas -- pelakunya dikecualikan lewat `user.userId`.
    await this.notificationsService.notifyComplaintForwarded(updated, opd.nama, user.userId);

    return this.toEntity(updated as ComplaintWithAttachments, user.userId);
  }

  /**
   * `PATCH /complaints/:id/alihkan` -- memindahkan pengaduan yang SUDAH
   * bertujuan ke instansi lain yang lebih berwenang (5 November 2026).
   *
   * BEDANYA DARI `forward()`, dan sebabnya rute ini berdiri sendiri. Penerusan
   * mengisi tujuan yang masih kosong, hanya boleh dilakukan Admin Kabupaten,
   * dan tak menggeser status. Pengalihan memindahkan tujuan yang sudah ada,
   * boleh dilakukan Admin OPD pemiliknya sendiri, dan menggeser status ke
   * `dialihkan` sambil memperbaiki kategori serta tingkatnya. Menyatukan
   * keduanya berarti satu badan fungsi bercabang pada `opdId == null` dengan
   * dua daftar peran, dan satu nama aksi audit untuk dua peristiwa berbeda.
   *
   * URUTAN PEMERIKSAAN MENGIKAT: penolakan PERAN lebih dahulu, baru penolakan
   * KEADAAN. Dibalik, akun yang tak berhak akan belajar bahwa tiketnya ada.
   */
  async alihkan(id: number, dto: AlihkanComplaintDto, user: CurrentUser): Promise<ComplaintEntity> {
    const complaint = await this.getByIdOrThrow(id);
    assertOpdAccess(user, complaint.opdId);

    if (complaint.opdId == null) {
      throw new BadRequestException(
        'Pengaduan ini belum diteruskan ke OPD mana pun, jadi tak ada yang dapat dialihkan. ' +
          'Teruskan ke OPD yang berwenang lebih dahulu.',
      );
    }
    if (!STATUS_BOLEH_DIALIHKAN.includes(complaint.status)) {
      throw new BadRequestException(
        `Pengaduan berstatus "${labelStatus(complaint.status)}" tidak dapat dialihkan`,
      );
    }

    const opd = await this.prisma.opd.findUnique({ where: { id: dto.opdId } });
    if (!opd) {
      // 404, bukan 400: yang tak ditemukan sumber daya yang ditunjuk pemanggil.
      throw new NotFoundException(`OPD dengan id ${dto.opdId} tidak ditemukan`);
    }
    // LEBIH KETAT daripada `forward()`, yang menerima baris apa pun yang ada.
    // OPD nonaktif tak punya akun yang dapat masuk -- `opd.service.ts`
    // menyaring `isActive: true` saat mencari penerima notifikasi -- sehingga
    // tiket yang mendarat di sana duduk tanpa seorang pun yang menanganinya.
    if (!opd.isActive) {
      throw new BadRequestException(
        `"${opd.nama}" sedang nonaktif, jadi pengaduan tidak dapat dialihkan ke sana`,
      );
    }
    if (dto.opdId === complaint.opdId) {
      throw new BadRequestException(
        'Pengaduan ini sudah ditujukan ke instansi tersebut; pilih instansi lain',
      );
    }

    // Tingkat DITURUNKAN dari nama OPD tujuan, tidak dikirim pemanggil: medan
    // yang dapat dikirim adalah medan yang dapat bertentangan dengan OPD-nya.
    const tingkatBaru = tingkatOpd(opd.nama);
    assertKategoriSesuaiTingkat(dto.kategori, tingkatBaru);

    // DIBACA SEBELUM pembaruan: sesudahnya nilainya sudah hilang, dan
    // notifikasi di bawah membutuhkannya untuk mengabari OPD yang kehilangan
    // tiket ini.
    const opdLamaId = complaint.opdId;
    const kategoriLama = complaint.kategori;

    const [updated] = await this.prisma.$transaction([
      this.prisma.complaint.update({
        where: { id },
        data: {
          opdId: dto.opdId,
          kategori: dto.kategori,
          tingkat: tingkatBaru,
          status: ComplaintStatus.dialihkan,
        },
        include: { attachments: true },
      }),
      // DI DALAM transaksi yang sama dengan perpindahannya, alasan yang sama
      // dengan `updateStatus`: riwayat yang kehilangan satu baris
      // memperlihatkan tiket yang berpindah tangan tanpa sebab, dan tak ada
      // cara memulihkannya dari data yang tersisa.
      this.prisma.complaintStatusHistory.create({
        data: {
          complaintId: id,
          status: ComplaintStatus.dialihkan,
          catatan: enkripsiKolom(dto.catatan, this.kunci),
          actorId: user.userId,
          // Tujuan disimpan PER BARIS. `complaints.opd_id` hanya menyimpan
          // pemilik terakhir, jadi tanpa kolom ini tiket yang dialihkan dua
          // kali kehilangan tujuan pertamanya bagi pelapor.
          opdTujuanId: dto.opdId,
        },
      }),
    ]);

    await this.audit.record(user.userId, 'alihkan', 'complaint', {
      complaintId: id,
      ticketNo: complaint.ticketNo,
      opdLama: opdLamaId,
      opdBaru: dto.opdId,
      kategoriLama,
      kategoriBaru: dto.kategori,
    });
    // BUKAN `notifyComplaintStatusChanged`. Statusnya memang berubah, tetapi
    // kabar kedua ("kini berstatus Dialihkan") atas peristiwa yang sama persis
    // bentuknya dengan BUG-018.
    await this.notificationsService.notifyComplaintAlihkan(
      updated,
      opd.nama,
      opdLamaId,
      user.userId,
    );

    return this.toEntity(updated as ComplaintWithAttachments, user.userId);
  }

  /**
   * Batas harian per akun (14 September 2026). Lihat complaints.constants.ts
   * untuk alasan angkanya.
   *
   * Dihitung dari BASIS DATA, bukan dari penghitung ThrottlerGuard: penghitung
   * itu hidup di memori dan hilang setiap proses dimulai ulang, sehingga batas
   * yang bersandar padanya dapat disetel ulang cukup dengan menunggu deploy.
   *
   * Batas HARI KALENDER menurut waktu server, bukan 24 jam bergulir. Pilihan
   * ini demi pesannya: "silakan kirim lagi besok" dapat dimengerti siapa pun,
   * sedangkan "tunggu 7 jam 12 menit lagi" menuntut pelapornya mengingat kapan
   * ia mengirim yang pertama.
   */
  private async assertBelumMelewatiBatasHarian(userId: number): Promise<void> {
    const awalHari = new Date();
    awalHari.setHours(0, 0, 0, 0);

    const batas = this.batasHarianPengaduan;

    const jumlah = await this.prisma.complaint.count({
      where: { userId, createdAt: { gte: awalHari } },
    });
    if (jumlah < batas) {
      return;
    }

    // 429, bukan 403: yang terjadi adalah "terlalu sering", bukan "tak berhak".
    // Kodenya membedakannya dari 429 batas laju per menit, yang pemulihannya
    // hitungan detik dan tak perlu menyelamatkan apa pun.
    throw new HttpException(
      {
        message: `Anda sudah mengirim ${batas} pengaduan hari ini. Silakan kirim lagi besok.`,
        code: BATAS_HARIAN_TERCAPAI,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  /**
   * OPD tujuan ada, DAN berada pada tingkat yang dinyatakan pengaduan
   * (4 November 2026).
   *
   * Dua pemeriksaan dalam satu kueri, bukan dua kueri: keduanya memerlukan
   * baris yang sama, dan `nama`-lah yang menentukan tingkatnya (lihat
   * `tingkat-opd.util.ts` untuk sebab tingkat itu tak disimpan sebagai kolom).
   */
  private async assertOpdExists(opdId: number, tingkat: TingkatPengaduan): Promise<void> {
    const opd = await this.prisma.opd.findUnique({
      where: { id: opdId },
      select: { nama: true },
    });
    if (!opd) {
      throw new BadRequestException(`OPD dengan id ${opdId} tidak ditemukan`);
    }
    assertOpdSesuaiTingkat(opd.nama, tingkat);
  }

  private async getByIdOrThrow(id: number): Promise<Complaint> {
    const complaint = await this.prisma.complaint.findUnique({ where: { id } });
    if (!complaint) {
      throw new NotFoundException(`Pengaduan dengan id ${id} tidak ditemukan`);
    }
    return complaint;
  }

  /** Ticket publik ber-format `PGD{YYYYMMDD}{4 acak}` — retry saat tabrakan (unique constraint). */
  private generateTicketNo(): string {
    const now = new Date();
    const datePart = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
      now.getDate(),
    ).padStart(2, '0')}`;
    const randomPart = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `PGD${datePart}${randomPart}`;
  }

  private async insertWithUniqueTicket(
    dto: CreateComplaintDto,
    // Sudah ter-parse & tervalidasi oleh `parseTanggalKejadian` di `create()`.
    // Diterima sebagai `Date`, bukan di-parse ulang di sini: mengulanginya
    // berarti dua tempat yang dapat berbeda pendapat tentang zona waktu.
    tanggalKejadian: Date,
    userId: number,
    attachments: SavedFile[],
  ): Promise<ComplaintWithAttachments> {
    const attachmentData = attachments.map(({ fileUrl, mimeType, sizeBytes }) => ({
      fileUrl,
      mimeType,
      sizeBytes,
    }));

    for (let attempt = 0; attempt < 5; attempt++) {
      const ticketNo = this.generateTicketNo();
      try {
        return await this.prisma.complaint.create({
          data: {
            ticketNo,
            userId,
            // `?? null` EKSPLISIT, bukan `dto.opdId` apa adanya: undefined akan
            // membuat Prisma menghilangkan kolomnya dari INSERT, dan meski
            // hasilnya kebetulan sama (default NULL), yang tersurat di sini
            // adalah "belum bertujuan" -- bukan "lupa diisi".
            opdId: dto.opdId ?? null,
            tingkat: dto.tingkat,
            kategori: dto.kategori,
            judul: dto.judul,
            uraian: enkripsiKolom(dto.uraian, this.kunci),
            tanggalKejadian,
            // SATU PERLAKUAN dengan `uraian` di atas. Lokasi kejadian lazim
            // menunjuk alamat rumah seseorang -- kalau isi pengaduannya
            // terenkripsi sementara tempatnya tidak, janji "isi pengaduan
            // terenkripsi" hanya setengah ditepati.
            lokasiKejadian: enkripsiKolom(dto.lokasiKejadian, this.kunci),
            isAnonim: dto.isAnonim ?? false,
            attachments: { create: attachmentData },
            // Baris pertama riwayat: peristiwa pengirimannya (4 November
            // 2026). Statusnya `terkirim` meski kolom `status` pengaduannya
            // sudah `menunggu_verifikasi` sejak detik ini -- keduanya benar,
            // lihat enum ComplaintStatus.
            //
            // DITULIS DI SINI, dalam `create` yang sama, bukan sesudahnya:
            // penulisan kedua yang gagal akan meninggalkan pengaduan tanpa
            // riwayat sama sekali, dan tak ada yang dapat merekonstruksinya.
            // `actorId` sengaja tak diisi: yang mengirim pengaduan adalah
            // pelapornya, dan baris ini mencatat tindakan SISTEM menerimanya.
            statusHistory: {
              create: { status: ComplaintStatus.terkirim, actorId: null },
            },
          },
          include: { attachments: true },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          continue; // tabrakan nomor tiket — coba lagi dengan nomor baru
        }
        throw err;
      }
    }
    throw new ConflictException('Gagal membuat nomor tiket unik, silakan coba lagi');
  }

  /**
   * Validasi lampiran (batas bisnis — 400 yang jelas, bukan error multer).
   *
   * URUTANNYA disengaja: jumlah -> ukuran -> tipe & isi. Ukuran diperiksa
   * sebelum isi karena membaca angka ajaib pada berkas 5MB+ yang toh akan
   * ditolak hanya membuang kerja; dan setiap berkas gagal dengan pesan yang
   * benar-benar menyebut sebabnya, bukan sebab pertama yang kebetulan cocok.
   */
  private validateFiles(files: Express.Multer.File[] | undefined): Express.Multer.File[] {
    const list = files ?? [];
    if (list.length > MAX_FILES) {
      throw new BadRequestException(`Maksimal ${MAX_FILES} lampiran per pengaduan`);
    }
    for (const file of list) {
      if (file.size > MAX_FILE_SIZE_BYTES) {
        throw new BadRequestException(
          `Ukuran berkas "${file.originalname}" melebihi ${BATAS_UKURAN_LAMPIRAN_LABEL}`,
        );
      }
      // Memeriksa ISI berkas, bukan hanya header `Content-Type` kiriman (temuan
      // audit T2, 7 September 2026 — serangan SVG-mengaku-PNG yang terbukti
      // berjalan). Lihat attachment.util.ts untuk alasan lengkapnya.
      assertAllowedContent(file);
    }
    return list;
  }

  private async persistFiles(files: Express.Multer.File[]): Promise<SavedFile[]> {
    if (files.length === 0) {
      return [];
    }
    const dir = path.join(this.uploadDir, 'complaints');
    await fs.mkdir(dir, { recursive: true });

    const saved: SavedFile[] = [];
    for (const file of files) {
      // Ekstensi ditentukan MIME yang SUDAH divalidasi isinya, bukan nama
      // kiriman: ekstensi itulah yang dipakai `express.static` menentukan
      // `Content-Type`, jadi membiarkan pengirim memilihnya berarti membiarkan
      // pengirim memilih bagaimana berkasnya dieksekusi di peramban orang lain.
      const filename = `${randomUUID()}-${safeFilename(file.originalname, file.mimetype)}`;
      const absolutePath = path.join(dir, filename);
      // TERENKRIPSI DI DISK (23 September 2026). Lampiran pengaduan adalah foto
      // bukti: wajah, dokumen, kadang identitas. Sampai hari ini ia tersimpan
      // apa adanya, sehingga siapa pun yang memperoleh berkas disknya membacanya
      // langsung tanpa melewati satu pun pemeriksaan yang ditulis aplikasi ini.
      //
      // `sizeBytes` di bawah TETAP ukuran berkas ASLI, bukan ciphertext. Angka
      // itulah yang ditampilkan kepada pengguna, dan 49 byte amplop bukan
      // urusannya. Ukuran yang tersimpan juga tetap dapat dibandingkan dengan
      // batas 5MB tanpa harus tahu soal enkripsi sama sekali.
      await fs.writeFile(absolutePath, enkripsi(file.buffer, this.kunci, INFO_LAMPIRAN));
      saved.push({
        fileUrl: `/uploads/complaints/${filename}`,
        mimeType: file.mimetype,
        sizeBytes: file.size,
        absolutePath,
      });
    }
    return saved;
  }

  private async cleanupFiles(saved: SavedFile[]): Promise<void> {
    await Promise.all(
      saved.map(async (file) => {
        try {
          await fs.unlink(file.absolutePath);
        } catch (err) {
          this.logger.warn(
            `Gagal membersihkan file tanpa induk ${file.absolutePath}: ${String(err)}`,
          );
        }
      }),
    );
  }

  /**
   * Penyamaran pengaduan anonim terjadi DI SINI, satu tempat: seluruh jalur baca
   * (findAll, findByTicketNo, updateStatus, create) melewatinya.
   *
   * Field DIHAPUS, bukan diisi null. Dan penyamaran ini TIDAK bergantung pada
   * siapa yang meminta -- termasuk pemilik pengaduan itu sendiri, yang toh tak
   * memerlukan id-nya sendiri (pola sama MyResponseEntity). Begitu ada satu
   * pengecualian berbasis peran di sini, janji anonim bergantung pada disiplin
   * pemakainya, bukan pada sistem.
   */
  /**
   * Dekripsi kolom yang boleh tak ada. TIGA KEADAAN DIBEDAKAN: `undefined`
   * (kueri tak menariknya), `null` (Helpdesk tak mengirimnya), dan teks
   * (ada isinya). Menyatukan dua yang pertama akan membuat daftar pengaduan
   * tampak menyatakan bahwa seluruh pelapor tak punya NIK.
   */
  private dekripsiOpsional(nilai: string | null | undefined): string | null | undefined {
    if (nilai === undefined || nilai === null) {
      return nilai;
    }
    return dekripsiKolom(nilai, this.kunci);
  }

  private toEntity(row: ComplaintWithAttachments, sub: number): ComplaintEntity {
    const { user, opd, statusHistory, ...rest } = row;
    const entity = new ComplaintEntity({
      ...rest,
      // DEKRIPSI DI SINI, di chokepoint yang komentar berkas ini sendiri sudah
      // menyatakan dilewati SELURUH jalur baca (23 September 2026). Baris lama
      // yang masih polos dikembalikan apa adanya oleh `dekripsiKolom`, jadi
      // migrasi boleh bertahap dan sistem tak pernah harus berhenti.
      uraian: dekripsiKolom(rest.uraian, this.kunci),
      // Sepasang dengan enkripsinya di `insertWithUniqueTicket`. `null`
      // DIPERTAHANKAN sebagai `null` lewat `dekripsiOpsional`: itulah 19
      // pengaduan yang dibuat sebelum medan ini lahir, dan tampilan
      // menyembunyikan barisnya alih-alih menggambar tanda hubung.
      lokasiKejadian: this.dekripsiOpsional(rest.lokasiKejadian) ?? null,
      attachments: this.tandaTanganiLampiran(rest.attachments, sub),
      reporterNama: user?.nama,
      // DIDEKRIPSI DI CHOKEPOINT YANG SAMA dengan `uraian` di atas. `undefined`
      // dipertahankan sebagai `undefined` (daftar tak menariknya) sementara
      // `null` dipertahankan sebagai `null` (Helpdesk memang tak mengirimnya) --
      // tampilan membedakan keduanya untuk memutuskan menyembunyikan baris.
      // DISAMARKAN DI SINI, di hulu. NIK ini milik PELAPOR, bukan milik
      // petugas yang membukanya; nomor penuhnya tak punya alasan meninggalkan
      // server. Ditaruh di chokepoint yang sama dengan dekripsi supaya ekspor
      // PDF -- yang membaca medan ini juga -- ikut terlindungi tanpa pekerjaan
      // tambahan. Lihat common/identitas/nik.ts.
      reporterNik: samarkanNik(this.dekripsiOpsional(user?.nik)),
      reporterNomorHp: this.dekripsiOpsional(user?.nomorHp),
      reporterAlamat: this.dekripsiOpsional(user?.alamat),
      opdNama: opd?.nama,
      // `undefined` DIPERTAHANKAN bila kuerinya tak menariknya; array kosong
      // akan terbaca klien sebagai "tiket ini tak punya riwayat", yang tak
      // pernah benar.
      statusHistory: statusHistory?.map(
        (baris) =>
          new ComplaintStatusHistoryEntity({
            id: baris.id,
            status: baris.status,
            label: labelStatus(baris.status),
            // Didekripsi di chokepoint yang SAMA dengan `uraian` di atas.
            catatan: baris.catatan ? dekripsiKolom(baris.catatan, this.kunci) : null,
            // `null` = sistem. Lihat entitasnya.
            actorNama: baris.actor?.nama ?? null,
            // Terisi HANYA pada baris dialihkan; null pada yang lain.
            opdTujuanNama: baris.opdTujuan?.nama ?? null,
            createdAt: baris.createdAt,
          }),
      ),
    });
    if (row.isAnonim) {
      delete entity.userId;
      delete entity.reporterNama;
      // Janji anonim berlaku untuk SELURUH identitas, bukan namanya saja.
      // Ketiga medan ini justru yang paling menunjuk satu orang.
      delete entity.reporterNik;
      delete entity.reporterNomorHp;
      delete entity.reporterAlamat;
    }
    return entity;
  }

  /**
   * Balasan pada pengaduan anonim: `authorId` dihilangkan bila penulisnya
   * pelapor. Balasan admin sengaja TETAP membawanya -- itu bukan identitas yang
   * dijanjikan tersembunyi, dan frontend memerlukannya untuk membedakan pihak.
   */
  private toReplyEntity(
    row: ComplaintReply & { attachments: ComplaintAttachment[] },
    complaint: { userId: number; isAnonim: boolean },
    sub: number,
  ): ComplaintReplyEntity {
    const entity = new ComplaintReplyEntity({
      ...row,
      // Sepasang dengan enkripsi di ketiga jalur tulis. Pembaca yang kelak
      // melewati chokepoint ini akan menampilkan `enc:v1:...` kepada pengguna --
      // kegagalan yang TERLIHAT, bukan senyap, dan itulah sebabnya pendekatan
      // tersurat ini dipilih alih-alih ekstensi Prisma yang mengenai semua
      // bentuk kueri sekaligus dan gagal tanpa gejala.
      pesan: dekripsiKolom(row.pesan, this.kunci),
      // Lampiran pada balasan chat menempuh jalur penyajian yang SAMA
      // (`/uploads/*`), jadi ia perlu tanda tangan yang sama. Tanpa ini gambar
      // di percakapan gagal dimuat 403 -- gejalanya berbeda dari kebocoran,
      // tapi tetap harus benar.
      attachments: this.tandaTanganiLampiran(row.attachments, sub),
    });
    if (complaint.isAnonim && row.authorId === complaint.userId) {
      delete entity.authorId;
    }
    return entity;
  }
}
