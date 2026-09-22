import { NotFoundException } from '@nestjs/common';
import { ComplaintStatus, NotificationType, Role } from '@prisma/client';
import type { Complaint } from '@prisma/client';
import { FULL_ACCESS_ROLES } from '../../common/auth/role.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

const respondenUser = (userId = 10): CurrentUser => ({
  userId,
  roles: [Role.responden],
  actingRole: Role.responden,
  opdId: null,
});

/**
 * Sejak superuser dipisah kembali (2026-08-20), broadcast pengawasan menyasar
 * `role: { in: [kabupaten, superuser] }` -- bukan lagi satu nilai peran. Mock
 * di bawah membedakan kueri itu lewat bentuknya, bukan mencocokkan nilai persis,
 * supaya penambahan peran berhak penuh tak perlu menyunting tiap mock lagi.
 */
const isFullAccessQuery = (where: { roles?: unknown }): boolean =>
  typeof where.roles === 'object' && where.roles !== null && 'hasSome' in where.roles;

const complaint = (over: Partial<Complaint> = {}): Complaint =>
  ({
    id: 1,
    ticketNo: 'PGD20260805ABCD',
    userId: 10,
    opdId: 5,
    kategori: 'lainnya',
    judul: 'Jalan rusak',
    uraian: 'Uraian',
    status: ComplaintStatus.diterima,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...over,
  }) as Complaint;

describe('NotificationsService', () => {
  const prisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { findMany: jest.fn() },
    surveyResponse: { count: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const service = new NotificationsService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    // Default: tak ada kabupaten/OPD lain (kecuali override per test) --
    // supaya assertion `toHaveBeenCalledTimes` di test lama tak ikut
    // menghitung broadcast kabupaten yg SEKARANG selalu dicoba (2026-08-06).
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
  });

  describe('notifyComplaintCreated', () => {
    it('membuat notifikasi utk Admin OPD tujuan (link admin-opd), TIDAK utk pelapor', async () => {
      (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (where.roles?.has === Role.opd) return Promise.resolve([{ id: 200 }]);
        return Promise.resolve([]);
      });

      await service.notifyComplaintCreated(complaint());

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 200,
          untukPeran: Role.opd,
          type: NotificationType.complaint_created,
          title: 'Pengaduan Baru Masuk',
          message: 'Pengaduan baru PGD20260805ABCD masuk ke OPD Anda',
          link: '/admin-opd/complaints/PGD20260805ABCD',
        },
      });
      expect(prisma.notification.create).not.toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 10 }) }),
      );
    });

    it('juga membuat notifikasi utk kabupaten (oversight, link admin-kab)', async () => {
      (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (isFullAccessQuery(where)) return Promise.resolve([{ id: 300 }]);
        return Promise.resolve([]);
      });

      await service.notifyComplaintCreated(complaint());

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 300,
          untukPeran: Role.kabupaten,
          type: NotificationType.complaint_created,
          title: 'Pengaduan Baru Masuk',
          message: 'Pengaduan baru PGD20260805ABCD masuk',
          link: '/admin-kab/complaints/PGD20260805ABCD',
        },
      });
    });

    it('gagal mencari penerima TIDAK melempar error (efek samping)', async () => {
      (prisma.user.findMany as jest.Mock).mockRejectedValue(new Error('DB down'));
      await expect(service.notifyComplaintCreated(complaint())).resolves.toBeUndefined();
    });
  });

  describe('notifyComplaintStatusChanged', () => {
    it('membuat notifikasi utk pelapor dgn label status & link yg benar', async () => {
      await service.notifyComplaintStatusChanged(
        complaint({ status: ComplaintStatus.diproses }),
        999,
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 10,
          untukPeran: Role.responden,
          type: NotificationType.complaint_status_changed,
          title: 'Status Pengaduan Diperbarui',
          message: 'Pengaduan PGD20260805ABCD kini berstatus "Diproses"',
          link: '/complaints/PGD20260805ABCD',
        },
      });
    });

    it('juga memberi tahu kabupaten (oversight), kecuali pelaku aksinya sendiri', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 300 }]);

      await service.notifyComplaintStatusChanged(complaint(), 999);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: {
          // `hasSome`, bukan `in`: kolomnya kini array (5 September 2026), dan
          // yang dicari adalah akun yang MEMILIKI salah satu role berhak penuh.
          roles: { hasSome: [...FULL_ACCESS_ROLES] },
          isActive: true,
          id: { not: 999 },
        },
        select: { id: true },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 300,
            link: '/admin-kab/complaints/PGD20260805ABCD',
          }),
        }),
      );
    });

    it('gagal membuat notifikasi TIDAK melempar error (efek samping, bukan aksi utama)', async () => {
      (prisma.notification.create as jest.Mock).mockRejectedValueOnce(new Error('DB down'));
      await expect(service.notifyComplaintStatusChanged(complaint(), 999)).resolves.toBeUndefined();
    });
  });

  /**
   * ARAH BALASAN DITENTUKAN PERAN YANG DIPAKAI, BUKAN ID PENULIS (22 September
   * 2026, laporan pengguna: "notifikasi balasan tidak muncul" pada akun ber-3
   * peran).
   *
   * Sebelumnya arahnya disimpulkan dari `replyAuthorUserId === complaint.userId`.
   * Pada akun yang memegang beberapa peran sekaligus, pelapor dan petugas yang
   * menanganinya adalah orang yang sama, sehingga syarat itu SELALU benar dan
   * kotak masuk `responden` tak pernah menerima apa pun. Terukur di basis data
   * pengembangan: balasan sebagai admin dan balasan sebagai warga pada tiket
   * yang sama melahirkan notifikasi yang identik, keduanya `untukPeran: opd`.
   *
   * Kolom `dari_pelapor` pada baris balasannya sudah menyimpan arah yang benar
   * sejak awal -- dan komentar pada skemanya sudah menyatakan arah itu "tidak
   * dapat diturunkan dari author_id". Yang kurang hanyalah meneruskannya ke
   * sini.
   *
   * KOTAK MASUK MILIK PERAN, BUKAN MILIK ORANG. Itu sebabnya uji "akun yang
   * sama" di bawah mengharapkan notifikasi tetap lahir walau penerimanya adalah
   * penulisnya sendiri: ia menulis sebagai petugas, dan yang dikabari adalah
   * kotak wargannya, yang tak akan dilihatnya sampai ia berpindah peran.
   */
  describe('notifyComplaintReply', () => {
    const penulis = (userId: number, actingRole: Role) => ({ userId, actingRole });

    it('responden membalas -> semua Admin OPD aktif pemilik diberi tahu (link admin-opd)', async () => {
      (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (where.roles?.has === Role.opd) return Promise.resolve([{ id: 100 }, { id: 101 }]);
        return Promise.resolve([]);
      });

      await service.notifyComplaintReply(
        complaint({ userId: 10, opdId: 5 }),
        penulis(10, Role.responden),
      );

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { roles: { has: Role.opd }, opdId: 5, isActive: true },
        select: { id: true },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 100,
            link: '/admin-opd/complaints/PGD20260805ABCD',
          }),
        }),
      );
    });

    it('Admin OPD membalas -> pelapor diberi tahu (link responden)', async () => {
      await service.notifyComplaintReply(
        complaint({ userId: 10, opdId: 5 }),
        penulis(999, Role.opd),
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 10,
          untukPeran: Role.responden,
          type: NotificationType.complaint_reply,
          title: 'Balasan Baru pada Pengaduan',
          message: 'OPD membalas pengaduan PGD20260805ABCD Anda',
          link: '/complaints/PGD20260805ABCD',
        },
      });
    });

    /**
     * INI YANG DILAPORKAN PENGGUNA. Satu akun memegang peran warga sekaligus
     * admin OPD; ia melapor sebagai warga lalu membalas pengaduannya sendiri
     * sebagai petugas. Kotak masuk wargannya dulu tak pernah menyala.
     */
    it('akun yang sama dengan pelapor membalas SEBAGAI Admin OPD -> kotak warganya tetap diberi tahu', async () => {
      await service.notifyComplaintReply(
        complaint({ userId: 10, opdId: 5 }),
        penulis(10, Role.opd),
      );

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 10,
          untukPeran: Role.responden,
          type: NotificationType.complaint_reply,
          title: 'Balasan Baru pada Pengaduan',
          message: 'OPD membalas pengaduan PGD20260805ABCD Anda',
          link: '/complaints/PGD20260805ABCD',
        },
      });
    });

    /**
     * Arah sebaliknya, pada akun yang sama. Tanpa uji ini, penyelesaian yang
     * asal "selalu beri tahu pelapor" akan tampak benar pada uji di atas
     * sementara balasan warga tak pernah lagi sampai ke meja petugas.
     */
    it('akun yang sama membalas SEBAGAI warga -> yang diberi tahu Admin OPD, bukan kotak wargannya', async () => {
      (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (where.roles?.has === Role.opd) return Promise.resolve([{ id: 10 }]);
        return Promise.resolve([]);
      });

      await service.notifyComplaintReply(
        complaint({ userId: 10, opdId: 5 }),
        penulis(10, Role.responden),
      );

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: 10, untukPeran: Role.opd }),
        }),
      );
      expect(prisma.notification.create).not.toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ untukPeran: Role.responden }),
        }),
      );
    });

    it('juga memberi tahu kabupaten (oversight) siapapun yg membalas', async () => {
      (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (isFullAccessQuery(where)) return Promise.resolve([{ id: 300 }]);
        return Promise.resolve([]);
      });

      await service.notifyComplaintReply(
        complaint({ userId: 10, opdId: 5 }),
        penulis(999, Role.opd),
      );

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 300,
            link: '/admin-kab/complaints/PGD20260805ABCD',
          }),
        }),
      );
    });

    /** Pengecualian mengikuti peran yang dipakai: ia baru saja melakukannya sendiri di sana. */
    it('penulis yang bertindak SEBAGAI kabupaten dikecualikan dari broadcast kabupaten', async () => {
      await service.notifyComplaintReply(
        complaint({ userId: 10, opdId: 5 }),
        penulis(777, Role.kabupaten),
      );

      const kueriKab = (prisma.user.findMany as jest.Mock).mock.calls.find(([arg]) =>
        isFullAccessQuery(arg.where),
      );
      expect(kueriKab?.[0].where.id).toEqual({ not: 777 });
    });

    /**
     * Sebaliknya, ia TIDAK dikecualikan saat bertindak sebagai petugas OPD.
     * Kotak kabupatennya adalah meja lain dengan tugas lain; yang menulis tadi
     * adalah petugas OPD, dan pengawas kabupaten -- termasuk dirinya sendiri --
     * memang perlu tahu.
     */
    it('penulis yang bertindak sebagai Admin OPD tetap menerima di kotak kabupatennya', async () => {
      await service.notifyComplaintReply(
        complaint({ userId: 10, opdId: 5 }),
        penulis(777, Role.opd),
      );

      const kueriKab = (prisma.user.findMany as jest.Mock).mock.calls.find(([arg]) =>
        isFullAccessQuery(arg.where),
      );
      expect(kueriKab?.[0].where).not.toHaveProperty('id');
    });
  });

  /**
   * Jawaban survei masuk (13 September 2026, laporan pengguna: notifikasinya
   * "belum masuk ke admin OPD dan admin kabupaten/superuser").
   *
   * Dikirim pada TONGGAK saja. Uji "jawaban ke-2 s.d. ke-9" di bawah itulah
   * yang membedakan keputusan ini dari "satu jawaban satu notifikasi": survei
   * IKM bertarget ratusan responden akan mengubur notifikasi pengaduan yang
   * benar-benar butuh tindakan.
   */
  describe('notifySurveyResponse', () => {
    const survei = (over: Record<string, unknown> = {}) => ({
      id: 7,
      judul: 'Survei Kepuasan Layanan',
      opdId: 5,
      ...over,
    });
    const jumlahJawaban = (n: number) =>
      (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(n);

    it('jawaban pertama -> Admin OPD pemilik survei diberi tahu (link halaman responden)', async () => {
      jumlahJawaban(1);
      (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (where.roles?.has === Role.opd) return Promise.resolve([{ id: 200 }]);
        return Promise.resolve([]);
      });

      await service.notifySurveyResponse(survei(), 10);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { roles: { has: Role.opd }, opdId: 5, isActive: true },
        select: { id: true },
      });
      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 200,
          untukPeran: Role.opd,
          type: NotificationType.survey_response_created,
          title: 'Survei Mulai Menerima Jawaban',
          message: 'Survei "Survei Kepuasan Layanan" menerima jawaban pertama',
          link: '/admin-opd/surveys/7/responses',
        },
      });
    });

    it('jawaban ke-2 sampai ke-9 TIDAK memicu notifikasi apa pun', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 200 }]);

      for (const n of [2, 3, 4, 5, 6, 7, 8, 9]) {
        jumlahJawaban(n);
        await service.notifySurveyResponse(survei(), 10);
      }

      expect(prisma.notification.create).not.toHaveBeenCalled();
    });

    it.each([10, 25, 50, 100])(
      'tonggak ke-%i memicu notifikasi yang menyebut jumlahnya',
      async (n) => {
        jumlahJawaban(n);
        (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
          if (where.roles?.has === Role.opd) return Promise.resolve([{ id: 200 }]);
          return Promise.resolve([]);
        });

        await service.notifySurveyResponse(survei(), 10);

        expect(prisma.notification.create).toHaveBeenCalledWith({
          data: {
            userId: 200,
            untukPeran: Role.opd,
            type: NotificationType.survey_response_created,
            title: 'Jawaban Survei Bertambah',
            message: `Survei "Survei Kepuasan Layanan" telah menerima ${n} jawaban`,
            link: '/admin-opd/surveys/7/responses',
          },
        });
      },
    );

    it('sesudah 100, hanya kelipatan 100 yang memicu -- 150 diam, 200 berbunyi', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 200 }]);

      jumlahJawaban(150);
      await service.notifySurveyResponse(survei(), 10);
      expect(prisma.notification.create).not.toHaveBeenCalled();

      jumlahJawaban(200);
      await service.notifySurveyResponse(survei(), 10);
      expect(prisma.notification.create).toHaveBeenCalled();
    });

    it('juga memberi tahu kabupaten & superuser (link admin-kab)', async () => {
      jumlahJawaban(1);
      (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (isFullAccessQuery(where)) return Promise.resolve([{ id: 300 }]);
        return Promise.resolve([]);
      });

      await service.notifySurveyResponse(survei(), 10);

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 300,
            link: '/admin-kab/surveys/7/responses',
          }),
        }),
      );
    });

    /**
     * Kerahasiaan responden. Survei boleh diisi anonim, dan identitas pengisi
     * IKM memang bukan hal yang perlu diketahui admin -- jadi nomor pengguna
     * pengisi tak boleh bocor lewat pesan notifikasi.
     */
    it('pesan & judul tak pernah menyebut identitas pengisi', async () => {
      jumlahJawaban(1);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 200 }]);

      await service.notifySurveyResponse(survei(), 4242);

      expect(prisma.notification.create).toHaveBeenCalled();
      for (const [arg] of (prisma.notification.create as jest.Mock).mock.calls) {
        expect(`${arg.data.title} ${arg.data.message}`).not.toContain('4242');
      }
    });

    it('pengisi yang kebetulan berhak penuh dikecualikan dari broadcast kabupaten', async () => {
      jumlahJawaban(1);
      (prisma.user.findMany as jest.Mock).mockResolvedValue([]);

      await service.notifySurveyResponse(survei(), 42);

      const kueriKab = (prisma.user.findMany as jest.Mock).mock.calls
        .map(([arg]) => arg.where)
        .filter((where) => isFullAccessQuery(where));
      expect(kueriKab).toHaveLength(1);
      expect(kueriKab[0].id).toEqual({ not: 42 });
    });

    /**
     * Pengisi tanpa sesi (rute /survei/:id) tak punya baris `users` sama
     * sekali. Tak ada yang perlu dikecualikan, dan yang penting: kueri
     * penerimanya tetap berjalan, bukan tersaring habis oleh id semu.
     */
    it('pengisi tanpa sesi (null) -> kabupaten tetap dikabari, tanpa pengecualian id', async () => {
      jumlahJawaban(1);
      (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (isFullAccessQuery(where)) return Promise.resolve([{ id: 300 }]);
        return Promise.resolve([]);
      });

      await service.notifySurveyResponse(survei(), null);

      const kueriKab = (prisma.user.findMany as jest.Mock).mock.calls
        .map(([arg]) => arg.where)
        .filter((where) => isFullAccessQuery(where));
      expect(kueriKab).toHaveLength(1);
      expect(kueriKab[0]).not.toHaveProperty('id');
      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ userId: 300 }) }),
      );
    });

    it('gagal menghitung jawaban TIDAK melempar error (efek samping, bukan aksi utama)', async () => {
      (prisma.surveyResponse.count as jest.Mock).mockRejectedValueOnce(new Error('DB down'));
      await expect(service.notifySurveyResponse(survei(), 10)).resolves.toBeUndefined();
      expect(prisma.notification.create).not.toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('tak ditemukan / bukan milik -> NotFound (satu jalur, tak bocorkan keberadaan)', async () => {
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.markAsRead(1, respondenUser())).rejects.toThrow(NotFoundException);
      expect(prisma.notification.update).not.toHaveBeenCalled();
    });

    it('milik sendiri -> ditandai dibaca', async () => {
      (prisma.notification.findFirst as jest.Mock).mockResolvedValue({ id: 1, userId: 10 });
      (prisma.notification.update as jest.Mock).mockResolvedValue({ id: 1, isRead: true });

      const result = await service.markAsRead(1, respondenUser(10));

      expect(prisma.notification.findFirst).toHaveBeenCalledWith({ where: { id: 1, userId: 10 } });
      expect(result.isRead).toBe(true);
    });
  });

  describe('markAllAsRead', () => {
    it('hanya update milik user ini yg belum dibaca', async () => {
      (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 3 });
      const result = await service.markAllAsRead(respondenUser(10));

      expect(prisma.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: 10, isRead: false, untukPeran: Role.responden },
        data: { isRead: true },
      });
      expect(result).toEqual({ updated: 3 });
    });
  });

  describe('findMine', () => {
    it('unreadOnly=true menambahkan filter isRead:false', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
      await service.findMine({ page: 1, limit: 20, unreadOnly: true }, respondenUser(10));

      expect(prisma.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 10, untukPeran: Role.responden, isRead: false },
        }),
      );
    });
  });
});

/**
 * KOTAK MASUK TERPISAH PER PERAN (16 September 2026, pertanyaan pengguna:
 * "apakah seharusnya notif role warga tidak bisa tercampur dengan notif role
 * admin opd/kabupaten?").
 *
 * Sampai sebelum ini tabel notifikasi hanya punya `userId`, sementara
 * pengirimannya menyasar KEPEMILIKAN peran (`roles: { has }`) dan navigasinya
 * justru dikurung per peran yang SEDANG DIPAKAI (proxy.js). Akibatnya akun
 * berperan jamak melihat notifikasi pekerjaan admin saat memakai peran warga,
 * lengkap dengan tautan yang dipantulkan proxy kembali ke beranda, dan
 * lencananya menghitung hal yang tak bisa ditindaklanjuti di sesi itu.
 *
 * Peran tujuan ditulis SAAT NOTIFIKASI DIBUAT, bukan disimpulkan dari awalan
 * `link` saat dibaca: tiap pemanggil sudah tahu persis kepada siapa pesannya
 * ditujukan, sedangkan awalan tautan hanya kebetulan sejalan dan diam-diam
 * salah golong begitu ada notifikasi tanpa tautan.
 */
describe('NotificationsService — pemisahan kotak masuk per peran', () => {
  const prisma = {
    notification: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    user: { findMany: jest.fn() },
    surveyResponse: { count: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const service = new NotificationsService(prisma);

  /** Kumpulkan `data` dari tiap pemanggilan notification.create. */
  const barisDibuat = (): Array<{ userId: number; untukPeran: Role; link: string }> =>
    (prisma.notification.create as jest.Mock).mock.calls.map(([arg]) => arg.data);

  beforeEach(() => {
    jest.clearAllMocks();
    (prisma.user.findMany as jest.Mock).mockResolvedValue([]);
  });

  it('pengaduan baru: baris OPD bertanda peran opd, baris pengawasan bertanda kabupaten', async () => {
    (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
      if (where.roles?.has === Role.opd) return Promise.resolve([{ id: 200 }]);
      if (isFullAccessQuery(where)) return Promise.resolve([{ id: 300 }]);
      return Promise.resolve([]);
    });

    await service.notifyComplaintCreated(complaint());

    const baris = barisDibuat();
    expect(baris).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: 200, untukPeran: Role.opd }),
        expect.objectContaining({ userId: 300, untukPeran: Role.kabupaten }),
      ]),
    );
  });

  it('status pengaduan berubah: baris untuk pelapor bertanda peran responden', async () => {
    await service.notifyComplaintStatusChanged(complaint({ userId: 10 }), 99);

    expect(barisDibuat()).toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: 10, untukPeran: Role.responden })]),
    );
  });

  it('balasan admin: baris untuk pelapor bertanda peran responden', async () => {
    await service.notifyComplaintReply(complaint({ userId: 10 }), {
      userId: 99,
      actingRole: Role.opd,
    });

    expect(barisDibuat()).toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: 10, untukPeran: Role.responden })]),
    );
  });

  it('balasan pelapor: baris untuk Admin OPD bertanda peran opd', async () => {
    (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
      if (where.roles?.has === Role.opd) return Promise.resolve([{ id: 200 }]);
      return Promise.resolve([]);
    });

    await service.notifyComplaintReply(complaint({ userId: 10 }), {
      userId: 10,
      actingRole: Role.responden,
    });

    expect(barisDibuat()).toEqual(
      expect.arrayContaining([expect.objectContaining({ userId: 200, untukPeran: Role.opd })]),
    );
  });

  it('jawaban survei masuk: baris OPD bertanda opd, pengawasan bertanda kabupaten', async () => {
    (prisma.surveyResponse.count as jest.Mock).mockResolvedValue(1);
    (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
      if (where.roles?.has === Role.opd) return Promise.resolve([{ id: 200 }]);
      if (isFullAccessQuery(where)) return Promise.resolve([{ id: 300 }]);
      return Promise.resolve([]);
    });

    await service.notifySurveyResponse({ id: 7, judul: 'SKM Triwulan III', opdId: 5 }, null);

    const baris = barisDibuat();
    expect(baris).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: 200, untukPeran: Role.opd }),
        expect.objectContaining({ userId: 300, untukPeran: Role.kabupaten }),
      ]),
    );
  });

  it('daftar disaring peran yang SEDANG DIPAKAI, bukan seluruh milik akun', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);

    await service.findMine({ page: 1, limit: 20 }, respondenUser(10));

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 10, untukPeran: Role.responden }),
      }),
    );
  });

  /**
   * Akun yang sama, peran berbeda, harus menghasilkan kueri berbeda. Inilah
   * yang tak bisa dijawab oleh penyaringan berdasar `userId` saja.
   */
  it('akun yang sama dengan peran berbeda menyaring peran yang berbeda pula', async () => {
    (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);

    await service.findMine(
      { page: 1, limit: 20 },
      { userId: 10, roles: [Role.responden, Role.opd], actingRole: Role.opd, opdId: 5 },
    );

    expect(prisma.notification.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ userId: 10, untukPeran: Role.opd }),
      }),
    );
  });

  it('hitungan belum dibaca ikut disaring peran yang dipakai', async () => {
    (prisma.notification.count as jest.Mock).mockResolvedValue(0);

    await service.countUnread(respondenUser(10));

    expect(prisma.notification.count).toHaveBeenCalledWith({
      where: { userId: 10, isRead: false, untukPeran: Role.responden },
    });
  });

  /**
   * "Tandai semua dibaca" dari sesi peran warga TIDAK BOLEH membungkam
   * notifikasi peran admin yang belum pernah dilihat pemiliknya -- justru
   * karena peran itu menyembunyikannya, ia tak punya kesempatan membacanya.
   */
  it('tandai semua dibaca hanya mengenai peran yang sedang dipakai', async () => {
    (prisma.notification.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

    await service.markAllAsRead(respondenUser(10));

    expect(prisma.notification.updateMany).toHaveBeenCalledWith({
      where: { userId: 10, isRead: false, untukPeran: Role.responden },
      data: { isRead: true },
    });
  });
});
