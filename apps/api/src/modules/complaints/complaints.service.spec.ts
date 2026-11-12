import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { dekripsiKolom, enkripsiKolom } from '../../common/crypto/kolom';
import { ComplaintStatus, Prisma, Role, TingkatPengaduan } from '@prisma/client';
import type { CreateComplaintDto } from './dto/create-complaint.dto';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { BATAS_HARIAN_PENGADUAN_BAKU } from './complaints.constants';
import type { AuditService } from '../audit/audit.service';
import type { ConsentService } from '../auth/consent.service';
import type { NotificationsService } from '../notifications/notifications.service';
import { ComplaintsService } from './complaints.service';

const respondenUser = (userId = 10): CurrentUser => ({
  userId,
  roles: [Role.responden],
  actingRole: Role.responden,
  opdId: null,
});
const opdUser = (opdId: number | null): CurrentUser => ({
  userId: 1,
  roles: [Role.opd],
  actingRole: Role.opd,
  opdId,
});
const kabupatenUser = (): CurrentUser => ({
  userId: 2,
  roles: [Role.kabupaten],
  actingRole: Role.kabupaten,
  opdId: null,
});
/**
 * Akun Admin Kabupaten KEDUA (id 3), dipakai untuk membuktikan bahwa bukan
 * akunnya yang menentukan melainkan perannya. Pembantu ini sempat bernama
 * `superUser` sambil membangun `Role.kabupaten` -- peran `superuser` dilebur
 * 15 September 2026 dan nilai enumnya dibuang, jadi namanya menyebut peran yang
 * tak mungkin dibangun (dibereskan 14 Oktober 2026).
 */
const kabupatenUserLain = (): CurrentUser => ({
  userId: 3,
  roles: [Role.kabupaten],
  actingRole: Role.kabupaten,
  opdId: null,
});

/**
 * `CreateComplaintDto` yang sah & lengkap (4 November 2026).
 *
 * DITAMBAHKAN saat `tingkat`, `tanggalKejadian`, dan `lokasiKejadian` menjadi
 * wajib. Sebelumnya setiap uji `create` mengetik objeknya sendiri, dan setiap
 * medan wajib baru berarti empat belas suntingan yang mudah terlewat satu.
 */
const dtoPengaduan = (over: Partial<CreateComplaintDto> = {}): CreateComplaintDto => ({
  opdId: 5,
  tingkat: TingkatPengaduan.kabupaten,
  kategori: 'kab_lainnya',
  judul: 'X',
  uraian: 'Y',
  // TANGGAL TETAP, bukan `new Date()`: `parseTanggalKejadian` menolak tanggal
  // di masa depan, dan tanggal yang ikut berjalan membuat uji ini bergantung
  // pada jam mesin yang menjalankannya.
  tanggalKejadian: '2026-11-01',
  lokasiKejadian: 'Jl. Raya Caruban No. 1',
  ...over,
});

const complaintRow = (over: Record<string, unknown> = {}) => ({
  id: 1,
  ticketNo: 'PGD20260729ABCD',
  userId: 10,
  opdId: 5,
  tingkat: TingkatPengaduan.kabupaten,
  kategori: 'kab_lainnya',
  judul: 'Jalan rusak',
  uraian: 'Jalan berlubang di depan kantor desa',
  tanggalKejadian: new Date('2026-11-01T00:00:00.000Z'),
  lokasiKejadian: 'Jl. Raya Caruban No. 1',
  status: ComplaintStatus.menunggu_verifikasi,
  createdAt: new Date(),
  updatedAt: new Date(),
  attachments: [],
  ...over,
});

const p2002 = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

/**
 * Jawaban Prisma saat `update` bersyarat tak menemukan baris yang cocok --
 * yaitu saat keadaan tiket sudah diubah permintaan lain (BUG-078).
 */
const p2025 = () =>
  new Prisma.PrismaClientKnownRequestError('Record to update not found.', {
    code: 'P2025',
    clientVersion: 'test',
  });

const PESAN_BERUBAH_SERENTAK = /baru saja diubah oleh petugas lain/;

/**
 * Kunci uji untuk enkripsi kolom. Bukan kunci sungguhan mana pun, dan tak
 * pernah menyentuh disk: suite ini hanya memeriksa apa yang DIKIRIM ke Prisma.
 */
const KUNCI_UJI_KOLOM = Buffer.alloc(32, 0xb);

describe('ComplaintsService', () => {
  const prisma = {
    opd: { findUnique: jest.fn() },
    complaint: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    complaintReply: { create: jest.fn(), findMany: jest.fn() },
    complaintStatusHistory: { create: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  /**
   * Dijawab PER KUNCI, bukan satu nilai untuk semua (14 September 2026).
   * Sebelumnya tiruan ini mengembalikan 'uploads' untuk kunci apa pun, dan
   * begitu service membaca kunci kedua yang bertipe angka, nilai string itu
   * diam-diam ikut terpakai -- perbandingan `10 < 'uploads'` bernilai false dan
   * SELURUH pembuatan pengaduan tertolak dengan pesan yang menyebut "uploads"
   * sebagai jumlah.
   *
   * DIPERKETAT 23 September 2026 menjadi PETA SUNGGUHAN, bukan satu pengecualian
   * plus cadangan 'uploads'. Bentuk lama sudah setengah jalan: ia menjawab
   * `complaint.batasHarian` dengan benar dan SELURUH kunci lain dengan 'uploads'
   * -- termasuk kunci yang belum ada saat tiruan itu ditulis. Begitu service
   * membaca `crypto.dataKey`, ia menerima string 'uploads' sebagai kunci
   * enkripsi, dan suite ini gagal seluruhnya dengan pesan yang tak ada
   * hubungannya dengan apa yang sedang diuji.
   *
   * Peta ini gagal ke arah yang benar: kunci yang tak dikenal menjawab
   * `undefined`, sehingga service memakai nilai bakunya sendiri alih-alih
   * sebuah string yang kebetulan ada.
   */
  const NILAI_KONFIG: Record<string, unknown> = {
    'upload.dir': 'uploads',
    'complaint.batasHarian': BATAS_HARIAN_PENGADUAN_BAKU,
    'session.jwtSecret': 'rahasia-uji-yang-panjangnya-lebih-dari-32-karakter',
    'upload.signedUrlTtlSeconds': 3600,
    // Kunci uji tetap. Bukan kunci sungguhan mana pun, dan tak pernah menyentuh
    // disk: suite ini tak menulis lampiran ke direktori nyata.
    'crypto.dataKey': KUNCI_UJI_KOLOM.toString('hex'),
  };
  const config = {
    get: jest.fn((kunci: string) => NILAI_KONFIG[kunci]),
  } as unknown as ConfigService;
  const notificationsService = {
    notifyComplaintCreated: jest.fn(),
    notifyOpdTujuan: jest.fn(),
    notifyComplaintStatusChanged: jest.fn(),
    notifyComplaintReply: jest.fn(),
    notifyComplaintForwarded: jest.fn(),
    notifyComplaintAlihkan: jest.fn(),
  } as unknown as NotificationsService;
  const consent = {
    assertConsented: jest.fn().mockResolvedValue(undefined),
  } as unknown as ConsentService;
  const audit = { record: jest.fn().mockResolvedValue(undefined) };
  const service = new ComplaintsService(
    prisma,
    notificationsService,
    config,
    consent,
    audit as unknown as AuditService,
  );

  /**
   * Penegakan persetujuan PDP (celah 2, 2026-08-27) — pasangan pemeriksaan yang
   * sama di ResponsesService. Pengaduan memuat data pribadi (identitas pelapor,
   * isi keluhan, lampiran), jadi ia titik pengumpulan data yang sesungguhnya.
   */
  describe('penegakan persetujuan PDP', () => {
    it('menolak SEBELUM lampiran ditulis ke disk', async () => {
      (consent.assertConsented as jest.Mock).mockRejectedValueOnce(
        new ForbiddenException('Anda perlu memberikan persetujuan'),
      );

      await expect(
        service.create(
          { opdId: 1, kategori: 'aduan', judul: 'x', deskripsi: 'y' } as never,
          undefined,
          { userId: 10, roles: [Role.responden], actingRole: Role.responden, opdId: null },
        ),
      ).rejects.toThrow(ForbiddenException);

      // Urutan penting: menulis lampiran lalu menolak berarti meninggalkan
      // berkas tanpa induk di disk untuk pengaduan yang tak pernah ada.
      expect(prisma.opd.findUnique).not.toHaveBeenCalled();
    });
  });

  beforeEach(() => {
    jest.clearAllMocks();
    // Batas harian membaca `complaint.count` pada setiap pembuatan. Tanpa nilai
    // baku, tiruannya mengembalikan `undefined` dan perbandingannya bernilai
    // false -- SETIAP uji `create` di bawah lalu gagal dengan 429, bukan dengan
    // galat yang sedang diujinya.
    (prisma.complaint.count as jest.Mock).mockResolvedValue(0);
  });

  describe('create', () => {
    it('OPD tujuan tidak ada → BadRequest', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.create(dtoPengaduan({ opdId: 99 }), undefined, respondenUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it('lebih dari 5 lampiran → BadRequest', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5, nama: 'Dinas Kesehatan' });
      const files = Array.from({ length: 6 }, () => ({
        mimetype: 'image/png',
        size: 100,
        originalname: 'a.png',
        buffer: Buffer.from(''),
      })) as unknown as Express.Multer.File[];
      await expect(service.create(dtoPengaduan(), files, respondenUser())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('tipe berkas tidak diizinkan → BadRequest', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5, nama: 'Dinas Kesehatan' });
      const files = [
        { mimetype: 'application/zip', size: 100, originalname: 'a.zip', buffer: Buffer.from('') },
      ] as unknown as Express.Multer.File[];
      await expect(service.create(dtoPengaduan(), files, respondenUser())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('ukuran berkas > 5MB → BadRequest', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5, nama: 'Dinas Kesehatan' });
      const files = [
        {
          mimetype: 'image/png',
          size: 6 * 1024 * 1024,
          originalname: 'a.png',
          // Header PNG SAH (T2, 7 September 2026): sejak isi berkas ikut
          // diperiksa, buffer kosong akan tertangkap pemeriksaan ISI dan uji ini
          // lulus karena sebab yang salah. Yang harus diuji di sini UKURANnya.
          buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        },
      ] as unknown as Express.Multer.File[];
      await expect(service.create(dtoPengaduan(), files, respondenUser())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('sukses tanpa lampiran → ticketNo berformat PGD{tanggal}{acak}', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5, nama: 'Dinas Kesehatan' });
      (prisma.complaint.create as jest.Mock).mockResolvedValue(complaintRow());

      const result = await service.create(
        dtoPengaduan({ judul: 'Jalan rusak', uraian: 'Uraian' }),
        undefined,
        respondenUser(),
      );

      expect(result.ticketNo).toMatch(/^PGD\d{8}[A-Z0-9]{4}$/);
      expect(prisma.complaint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ attachments: { create: [] } }),
        }),
      );
    });

    it('tabrakan nomor tiket (P2002) → retry lalu sukses', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5, nama: 'Dinas Kesehatan' });
      (prisma.complaint.create as jest.Mock)
        .mockRejectedValueOnce(p2002())
        .mockResolvedValueOnce(complaintRow());

      const result = await service.create(dtoPengaduan(), undefined, respondenUser());

      expect(result.id).toBe(1);
      expect(prisma.complaint.create).toHaveBeenCalledTimes(2);
    });

    it('menyimpan isAnonim=true ke kolomnya', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5, nama: 'Dinas Kesehatan' });
      (prisma.complaint.create as jest.Mock).mockResolvedValue(complaintRow({ isAnonim: true }));

      await service.create(dtoPengaduan({ isAnonim: true }), undefined, respondenUser());

      expect(prisma.complaint.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isAnonim: true }) }),
      );
    });

    it('tanpa flag -> tersimpan false, bukan undefined', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5, nama: 'Dinas Kesehatan' });
      (prisma.complaint.create as jest.Mock).mockResolvedValue(complaintRow());

      await service.create(dtoPengaduan(), undefined, respondenUser());

      expect(prisma.complaint.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isAnonim: false }) }),
      );
    });

    it('tidak lagi mengirim kolom subKategori ke Prisma', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5, nama: 'Dinas Kesehatan' });
      (prisma.complaint.create as jest.Mock).mockResolvedValue(complaintRow());

      await service.create(dtoPengaduan(), undefined, respondenUser());

      expect(prisma.complaint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ subKategori: expect.anything() }),
        }),
      );
    });

    it('tabrakan nomor tiket terus-menerus → Conflict setelah 5 percobaan', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5, nama: 'Dinas Kesehatan' });
      (prisma.complaint.create as jest.Mock).mockRejectedValue(p2002());

      await expect(service.create(dtoPengaduan(), undefined, respondenUser())).rejects.toThrow(
        ConflictException,
      );
      expect(prisma.complaint.create).toHaveBeenCalledTimes(5);
    });
  });

  describe('findAll (ownership)', () => {
    it('Responden hanya melihat miliknya (where.userId)', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
      await service.findAll({ page: 1, limit: 20 }, respondenUser(10));
      expect(prisma.complaint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 10 } }),
      );
    });

    it('Admin OPD hanya OPD-nya (where.opdId)', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
      await service.findAll({ page: 1, limit: 20 }, opdUser(5));
      expect(prisma.complaint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { opdId: 5 } }),
      );
    });

    it('Kabupaten melihat semua (where kosong)', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
      await service.findAll({ page: 1, limit: 20 }, kabupatenUser());
      expect(prisma.complaint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('Admin OPD tanpa opdId → Forbidden', async () => {
      await expect(service.findAll({ page: 1, limit: 20 }, opdUser(null))).rejects.toThrow(
        ForbiddenException,
      );
    });

    // Filter `opdId` (2026-08-20) untuk Superuser yang memerankan satu OPD.
    it('filter opdId dari kabupaten → di-AND-kan (bukan menimpa) penyaring kepemilikan', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
      await service.findAll({ page: 1, limit: 20, opdId: 3 }, kabupatenUser());
      expect(prisma.complaint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { AND: [{ opdId: 3 }] } }),
      );
    });

    it('filter opdId TIDAK melebarkan akses: Admin OPD tetap terikat OPD-nya', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
      await service.findAll({ page: 1, limit: 20, opdId: 99 }, opdUser(5));
      // where.opdId (kepemilikan) TETAP 5 -- id 99 cuma menambah syarat, sehingga
      // hasilnya kosong, bukan data OPD 99.
      expect(prisma.complaint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { opdId: 5, AND: [{ opdId: 99 }] } }),
      );
    });

    it('filter opdId dari Responden tetap terikat userId-nya', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
      await service.findAll({ page: 1, limit: 20, opdId: 3 }, respondenUser(10));
      expect(prisma.complaint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 10, AND: [{ opdId: 3 }] } }),
      );
    });

    it('(INT-11/INT-18) menyertakan include user+opd & menyisipkan reporterNama+opdNama, tanpa membocorkan objek mentah', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        [complaintRow({ user: { nama: 'Warga Contoh' }, opd: { nama: 'Dinas Kesehatan' } })],
        1,
      ]);

      const result = await service.findAll({ page: 1, limit: 20 }, kabupatenUser());

      expect(prisma.complaint.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            attachments: true,
            user: { select: { nama: true } },
            opd: { select: { nama: true } },
          },
        }),
      );
      expect(result.items[0].reporterNama).toBe('Warga Contoh');
      expect(result.items[0].opdNama).toBe('Dinas Kesehatan');
      expect((result.items[0] as unknown as { user?: unknown }).user).toBeUndefined();
      expect((result.items[0] as unknown as { opd?: unknown }).opd).toBeUndefined();
    });
  });

  describe('findByTicketNo', () => {
    it('tidak ditemukan → NotFound', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findByTicketNo('PGDX', kabupatenUser())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Responden lain (bukan pemilik) → Forbidden', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ userId: 999 }));
      await expect(service.findByTicketNo('PGDX', respondenUser(10))).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('Admin OPD lain → Forbidden', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ opdId: 5 }));
      await expect(service.findByTicketNo('PGDX', opdUser(99))).rejects.toThrow(ForbiddenException);
    });

    it('Kabupaten selalu boleh (read-only)', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());
      const result = await service.findByTicketNo('PGDX', kabupatenUser());
      expect(result.id).toBe(1);
    });

    it('(INT-18/INT-20) menyertakan include user+opd & menyisipkan reporterNama+opdNama, tanpa membocorkan objek mentah', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ user: { nama: 'Warga Contoh' }, opd: { nama: 'Dinas Kesehatan' } }),
      );

      const result = await service.findByTicketNo('PGDX', kabupatenUser());

      expect(prisma.complaint.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            attachments: true,
            // Ketiga kolom identitas ikut sejak 1 Oktober 2026 -- hanya di
            // jalur detail ini. Bentuknya ditegaskan sendiri pada blok
            // "identitas pelapor pada detail" di bawah.
            user: { select: { nama: true, nik: true, nomorHp: true, alamat: true } },
            opd: { select: { nama: true } },
            // Riwayat status ikut sejak 4 November 2026 -- juga HANYA di
            // jalur detail ini; lihat uji `findAll` di atas yang menjaga ia
            // tak ikut tertarik per baris daftar.
            statusHistory: {
              include: {
                actor: { select: { nama: true } },
                // Instansi tujuan pengalihan ikut sejak 5 November 2026:
                // halaman detail pelapor tak punya daftar OPD untuk memetakan
                // idnya sendiri.
                opdTujuan: { select: { nama: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        }),
      );
      expect(result.reporterNama).toBe('Warga Contoh');
      expect(result.opdNama).toBe('Dinas Kesehatan');
      expect((result as unknown as { user?: unknown }).user).toBeUndefined();
      expect((result as unknown as { opd?: unknown }).opd).toBeUndefined();
    });

    it('memetakan riwayat status beserta labelnya, dan mendekripsi catatannya', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({
          status: ComplaintStatus.sedang_ditindaklanjuti,
          statusHistory: [
            {
              id: 1,
              status: ComplaintStatus.terkirim,
              catatan: null,
              actor: null,
              createdAt: new Date('2026-11-02T02:15:00.000Z'),
            },
            {
              id: 2,
              status: ComplaintStatus.diverifikasi,
              catatan: enkripsiKolom('Berkas lengkap dan sesuai', KUNCI_UJI_KOLOM),
              actor: { nama: 'Admin OPD (Contoh)' },
              createdAt: new Date('2026-11-02T06:20:00.000Z'),
            },
          ],
        }),
      );

      const result = await service.findByTicketNo('PGDX', kabupatenUser());

      expect(result.statusHistory).toHaveLength(2);
      // Label dikirim JADI: riwayat dapat memuat status yang kelak ditambahkan
      // backend lebih dulu, dan baris tanpa label merusak urutan ceritanya.
      expect(result.statusHistory?.[0]).toMatchObject({
        status: ComplaintStatus.terkirim,
        label: 'Terkirim',
        catatan: null,
        // `null` berarti SISTEM, bukan "tak diketahui" -- tampilan menulis
        // "Otomatis" karenanya.
        actorNama: null,
      });
      expect(result.statusHistory?.[1]).toMatchObject({
        label: 'Diverifikasi',
        catatan: 'Berkas lengkap dan sesuai',
        actorNama: 'Admin OPD (Contoh)',
      });
    });

    it('riwayat yang tak ditarik kueri tetap undefined, bukan array kosong', async () => {
      // Array kosong terbaca klien sebagai "tiket ini tak punya riwayat", dan
      // itu tak pernah benar sejak baris `terkirim` lahir bersama barisnya.
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());

      const result = await service.findByTicketNo('PGDX', kabupatenUser());

      expect(result.statusHistory).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('transisi tidak diizinkan (selesai → sedang_ditindaklanjuti) → BadRequest', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ status: ComplaintStatus.selesai }),
      );
      await expect(
        service.updateStatus(1, { status: ComplaintStatus.sedang_ditindaklanjuti }, opdUser(5)),
      ).rejects.toThrow(BadRequestException);
    });

    it('melompati tahap (menunggu_verifikasi → selesai) → BadRequest', async () => {
      // Alur baru punya lima tahap (4 November 2026), dan lompatan inilah yang
      // paling mungkin terjadi tanpa sengaja: tombol "Selesai" yang muncul
      // terlalu awal akan menamatkan tiket yang belum pernah diverifikasi
      // maupun ditindaklanjuti, dan riwayatnya kehilangan dua baris selamanya.
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());
      await expect(
        service.updateStatus(1, { status: ComplaintStatus.selesai }, opdUser(5)),
      ).rejects.toThrow(BadRequestException);
    });

    it('tak ada status yang boleh kembali ke terkirim', async () => {
      // `terkirim` hanya baris pertama riwayat, bukan status berjalan. Tanpa
      // penjaga ini sebuah tiket dapat dikembalikan ke keadaan yang tak punya
      // jalan keluar sama sekali.
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());
      await expect(
        service.updateStatus(1, { status: ComplaintStatus.terkirim }, opdUser(5)),
      ).rejects.toThrow(BadRequestException);
    });

    it.each([ComplaintStatus.ditolak, ComplaintStatus.perlu_perbaikan])(
      '%s tanpa catatan → BadRequest',
      async (status) => {
        // Keduanya menyuruh pelapor berhenti berharap atau melakukan sesuatu;
        // tanpa kalimat penjelas ia tak tahu apa yang salah maupun apa yang
        // kurang. `perlu_perbaikan` ikut sejak 4 November 2026.
        (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());
        await expect(service.updateStatus(1, { status }, opdUser(5))).rejects.toThrow(
          BadRequestException,
        );
      },
    );

    it('Admin OPD lain → Forbidden', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ opdId: 5 }));
      await expect(
        service.updateStatus(1, { status: ComplaintStatus.diverifikasi }, opdUser(99)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('menunggu_verifikasi → diverifikasi (tanpa catatan) sukses', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        complaintRow({ status: ComplaintStatus.diverifikasi }),
        { id: 1 },
      ]);

      const result = await service.updateStatus(
        1,
        { status: ComplaintStatus.diverifikasi },
        opdUser(5),
      );

      expect(result.status).toBe(ComplaintStatus.diverifikasi);
    });

    it('perlu_perbaikan dapat dikembalikan ke menunggu_verifikasi', async () => {
      // Keputusan pengguna 4 November 2026: "Perlu Perbaikan" bukan status
      // akhir. Admin yang mengembalikannya, bukan balasan pelapornya sendiri.
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ status: ComplaintStatus.perlu_perbaikan }),
      );
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        complaintRow({ status: ComplaintStatus.menunggu_verifikasi }),
        { id: 1 },
      ]);

      const result = await service.updateStatus(
        1,
        { status: ComplaintStatus.menunggu_verifikasi },
        opdUser(5),
      );

      expect(result.status).toBe(ComplaintStatus.menunggu_verifikasi);
    });

    it('catatan tersimpan TERENKRIPSI pada baris riwayat, bukan sebagai balasan percakapan', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ status: ComplaintStatus.sedang_ditindaklanjuti }),
      );
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        complaintRow({ status: ComplaintStatus.ditolak }),
        { id: 1 },
      ]);

      await service.updateStatus(
        1,
        { status: ComplaintStatus.ditolak, catatan: 'Bukan wewenang OPD ini' },
        opdUser(5),
      );

      expect(prisma.complaint.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: ComplaintStatus.ditolak } }),
      );
      expect(prisma.complaintStatusHistory.create).toHaveBeenCalledWith({
        data: {
          complaintId: 1,
          status: ComplaintStatus.ditolak,
          // TERENKRIPSI, bukan teks polos (23 September 2026, dipindahkan ke
          // riwayat 4 November 2026). Nilainya tak dapat ditulis sebagai
          // harapan tetap: garam dan iv acak membuatnya berbeda setiap kali.
          catatan: expect.stringMatching(/^enc:v1:/) as unknown as string,
          actorId: 1,
        },
      });

      // Dan ia harus dapat DIBUKA KEMBALI. Tanpa asersi ini, uji di atas akan
      // tetap hijau seandainya kode menulis blob yang tak berarti apa-apa.
      const ditulis = (prisma.complaintStatusHistory.create as jest.Mock).mock.calls[0][0] as {
        data: { catatan: string };
      };
      expect(dekripsiKolom(ditulis.data.catatan, KUNCI_UJI_KOLOM)).toBe('Bukan wewenang OPD ini');

      // PASANGANNYA, dan inilah yang menjaga perubahan 4 November 2026: sampai
      // hari itu catatan yang sama DISALIN menjadi sebuah balasan percakapan,
      // sehingga halaman detail menampilkan kalimatnya dua kali.
      expect(prisma.complaintReply.create).not.toHaveBeenCalled();
    });

    it('perpindahan tanpa catatan tetap menulis baris riwayat, dengan catatan null', async () => {
      // Riwayat yang hanya terisi saat ada catatan akan melubangi linimasa
      // justru pada tahap-tahap yang paling lazim dilalui.
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        complaintRow({ status: ComplaintStatus.diverifikasi }),
        { id: 1 },
      ]);

      await service.updateStatus(1, { status: ComplaintStatus.diverifikasi }, opdUser(5));

      expect(prisma.complaintStatusHistory.create).toHaveBeenCalledWith({
        data: {
          complaintId: 1,
          status: ComplaintStatus.diverifikasi,
          catatan: null,
          actorId: 1,
        },
      });
    });

    it('(D9) sukses -> memicu notifyComplaintStatusChanged dgn baris terbaru', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());
      const updatedRow = complaintRow({ status: ComplaintStatus.diverifikasi });
      (prisma.$transaction as jest.Mock).mockResolvedValue([updatedRow, { id: 1 }]);

      await service.updateStatus(1, { status: ComplaintStatus.diverifikasi }, opdUser(5));

      expect(notificationsService.notifyComplaintStatusChanged).toHaveBeenCalledWith(updatedRow, 1);
    });

    /**
     * BUG-078. Penulisan bersyarat pada status yang TADI DIBACA: permintaan
     * yang membaca status lama lalu kalah balapan tak boleh lagi menulis.
     */
    it('menulis hanya bila status masih sama dengan yang tadi diperiksa', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        complaintRow({ status: ComplaintStatus.diverifikasi }),
        { id: 1 },
      ]);

      await service.updateStatus(1, { status: ComplaintStatus.diverifikasi }, opdUser(5));

      expect(prisma.complaint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, status: ComplaintStatus.menunggu_verifikasi },
        }),
      );
    });

    it('kalah balapan -> Conflict berkalimat jelas, tanpa notifikasi', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());
      (prisma.$transaction as jest.Mock).mockRejectedValueOnce(p2025());

      const janji = service.updateStatus(1, { status: ComplaintStatus.diverifikasi }, opdUser(5));

      await expect(janji).rejects.toThrow(ConflictException);
      await expect(janji).rejects.toThrow(PESAN_BERUBAH_SERENTAK);
      expect(notificationsService.notifyComplaintStatusChanged).not.toHaveBeenCalled();
    });
  });

  describe('replies', () => {
    it('listReplies: pengaduan tidak ada → NotFound', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.listReplies(1, kabupatenUser())).rejects.toThrow(NotFoundException);
    });

    it('addReply: Responden bukan pemilik → Forbidden', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ userId: 999 }));
      await expect(
        service.addReply(1, { pesan: 'Halo' }, undefined, respondenUser(10)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('addReply: pesan kosong & tanpa lampiran → BadRequest', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ userId: 10 }));
      await expect(
        service.addReply(1, { pesan: '  ' }, undefined, respondenUser(10)),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.complaintReply.create).not.toHaveBeenCalled();
    });

    it('addReply: Responden pemilik → sukses', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ userId: 10 }));
      (prisma.complaintReply.create as jest.Mock).mockResolvedValue({
        id: 1,
        complaintId: 1,
        authorId: 10,
        pesan: 'Halo',
        createdAt: new Date(),
        // `attachments` SELALU ada pada baris sungguhan -- setiap query balasan
        // memakai `include: { attachments: true }`, dan tipenya pun menuntutnya.
        // Fixture ini menghilangkannya, jadi ia tak mewakili apa pun yang bisa
        // keluar dari Prisma (ketahuan saat penandatanganan lampiran ditambahkan,
        // 7 September 2026). Sengaja TIDAK ditambal `?? []` di kodenya: kalau
        // kelak ada query yang lupa `include`, lebih baik ia gagal keras
        // daripada diam-diam mengembalikan pengaduan tanpa lampirannya.
        attachments: [],
      });
      const result = await service.addReply(1, { pesan: 'Halo' }, undefined, respondenUser(10));
      expect(result.pesan).toBe('Halo');
    });

    /**
     * SIAPA penulisnya tak cukup untuk menentukan ia menulis sebagai apa.
     *
     * Satu akun di sini lazim memegang beberapa peran sekaligus, dan layar
     * masuk justru meminta penggunanya MEMILIH peran. Akun yang melaporkan
     * pengaduan lalu menanganinya sebagai petugas karena itu punya `userId`
     * yang sama persis dengan pelapor -- sehingga perbandingan id menggolongkan
     * balasan petugasnya sebagai balasan pelapor. Yang menentukan adalah peran
     * yang SEDANG DIPAKAI saat menulis, dan itu hanya diketahui di sini.
     */
    describe('penanda penulis balasan', () => {
      const balasanTersimpan = () =>
        (prisma.complaintReply.create as jest.Mock).mock.calls[0][0].data;

      beforeEach(() => {
        (prisma.complaintReply.create as jest.Mock).mockResolvedValue({
          id: 1,
          complaintId: 1,
          authorId: 10,
          pesan: 'Halo',
          createdAt: new Date(),
          attachments: [],
        });
      });

      it('ditulis dengan peran responden -> ditandai dari pelapor', async () => {
        (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ userId: 10 }));

        await service.addReply(1, { pesan: 'Halo' }, undefined, respondenUser(10));

        expect(balasanTersimpan().dariPelapor).toBe(true);
      });

      it('ditulis dengan peran OPD -> ditandai bukan dari pelapor', async () => {
        (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ opdId: 5 }));

        await service.addReply(1, { pesan: 'Halo' }, undefined, opdUser(5));

        expect(balasanTersimpan().dariPelapor).toBe(false);
      });

      it('akun pelapor yang menjawab SEBAGAI PETUGAS -> ditandai bukan dari pelapor', async () => {
        // Inilah kondisi yang selama ini keliru: id penulis sama dengan id
        // pelapor, tetapi ia sedang bertugas, bukan sedang mengadu.
        (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ userId: 3 }));

        await service.addReply(1, { pesan: 'Halo' }, undefined, kabupatenUserLain());

        expect(balasanTersimpan().dariPelapor).toBe(false);
      });
    });

    it('(D9) addReply memicu notifyComplaintReply dgn baris pengaduan & authorId pembalas', async () => {
      const row = complaintRow({ userId: 10 });
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(row);
      (prisma.complaintReply.create as jest.Mock).mockResolvedValue({
        id: 1,
        complaintId: 1,
        authorId: 10,
        pesan: 'Halo',
        createdAt: new Date(),
        // `attachments` SELALU ada pada baris sungguhan -- setiap query balasan
        // memakai `include: { attachments: true }`, dan tipenya pun menuntutnya.
        // Fixture ini menghilangkannya, jadi ia tak mewakili apa pun yang bisa
        // keluar dari Prisma (ketahuan saat penandatanganan lampiran ditambahkan,
        // 7 September 2026). Sengaja TIDAK ditambal `?? []` di kodenya: kalau
        // kelak ada query yang lupa `include`, lebih baik ia gagal keras
        // daripada diam-diam mengembalikan pengaduan tanpa lampirannya.
        attachments: [],
      });

      await service.addReply(1, { pesan: 'Halo' }, undefined, respondenUser(10));

      // Diserahkan UTUH, bukan id-nya saja: arah balasan ditentukan peran yang
      // sedang dipakai. Menyerahkan id akan mengembalikan cacat 22 September
      // 2026 -- balasan petugas dari akun pelapor digolongkan sebagai balasan
      // pelapor, dan kotak masuk wargannya tak pernah menyala.
      expect(notificationsService.notifyComplaintReply).toHaveBeenCalledWith(
        row,
        expect.objectContaining({ userId: 10, actingRole: Role.responden }),
      );
    });
  });
  /**
   * Uji KORELASI, bukan sekadar "nama tidak tampil": dua pengaduan anonim dari
   * satu pengguna harus tak dapat dikaitkan satu sama lain dari respons API --
   * kalau `userId` masih ikut, admin cukup membandingkan angkanya.
   */
  describe('penyamaran pengaduan anonim', () => {
    it('menghilangkan userId & reporterNama SEBAGAI KUNCI, bukan mengisinya null', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ isAnonim: true, user: { nama: 'Siti Aminah' }, opd: { nama: 'Dinkes' } }),
      );

      const hasil = await service.findByTicketNo('PGD20260729ABCD', kabupatenUser());

      expect(Object.keys(hasil)).not.toContain('userId');
      expect(Object.keys(hasil)).not.toContain('reporterNama');
      expect(hasil.isAnonim).toBe(true);
      // OPD tujuan bukan identitas pelapor -- tetap dikirim.
      expect(hasil.opdNama).toBe('Dinkes');
    });

    it('dua pengaduan anonim dari SATU pengguna tak dapat dikorelasikan', async () => {
      const rows = [
        complaintRow({ id: 1, ticketNo: 'PGD20260729AAAA', userId: 77, isAnonim: true }),
        complaintRow({ id: 2, ticketNo: 'PGD20260729BBBB', userId: 77, isAnonim: true }),
      ];
      (prisma.$transaction as jest.Mock).mockResolvedValue([rows, 2]);

      const hasil = await service.findAll({ page: 1, limit: 20 }, kabupatenUser());

      // Yang dibandingkan NILAI, bukan substring JSON. Versi lama memeriksa
      // `JSON.stringify(c)` tak memuat '77', dan itu flake yang akhirnya
      // meledak 7 September 2026: `createdAt` bermilidetik ".775Z" memuat "77"
      // tanpa ada kebocoran apa pun. Angka userId apa pun cepat atau lambat
      // muncul di dalam sebuah timestamp.
      //
      // Kekuatan uji aslinya dijaga dengan menelusuri nilai secara REKURSIF
      // (termasuk di dalam `attachments`), jadi kebocoran bersarang tetap
      // tertangkap. `Date` tak menyumbang nilai apa pun ke telusuran ini --
      // memang seharusnya begitu: waktu bukan identitas.
      const nilaiPrimitif = (o: unknown): unknown[] =>
        o !== null && typeof o === 'object'
          ? Object.values(o).flatMap((v) => nilaiPrimitif(v))
          : [o];

      const sidik = hasil.items.map((c) => nilaiPrimitif(c));
      for (const nilai of sidik) {
        expect(nilai).not.toContain(77);
        expect(nilai).not.toContain('77');
      }
      expect(hasil.items.every((c) => !('userId' in c))).toBe(true);
    });

    it('pengaduan biasa TIDAK berubah', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ isAnonim: false, user: { nama: 'Siti Aminah' } }),
      );

      const hasil = await service.findByTicketNo('PGD20260729ABCD', kabupatenUser());

      expect(hasil.userId).toBe(10);
      expect(hasil.reporterNama).toBe('Siti Aminah');
    });

    it('balasan pelapor kehilangan authorId; balasan admin tetap membawanya', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ isAnonim: true, userId: 10 }),
      );
      (prisma.complaintReply.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          complaintId: 1,
          authorId: 10,
          pesan: 'dari pelapor',
          createdAt: new Date(),
          attachments: [],
        },
        {
          id: 2,
          complaintId: 1,
          authorId: 3,
          pesan: 'dari admin',
          createdAt: new Date(),
          attachments: [],
        },
      ]);

      const balasan = await service.listReplies(1, kabupatenUser());

      expect('authorId' in balasan[0]).toBe(false);
      expect(balasan[1].authorId).toBe(3);
    });

    it('balasan pada pengaduan BIASA tetap membawa authorId pelapor', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ isAnonim: false, userId: 10 }),
      );
      (prisma.complaintReply.findMany as jest.Mock).mockResolvedValue([
        {
          id: 1,
          complaintId: 1,
          authorId: 10,
          pesan: 'dari pelapor',
          createdAt: new Date(),
          attachments: [],
        },
      ]);

      const balasan = await service.listReplies(1, kabupatenUser());

      expect(balasan[0].authorId).toBe(10);
    });
  });

  /**
   * PENGADUAN TANPA TUJUAN (permintaan pengguna 6 September 2026): "tambahkan
   * opsi Lainnya untuk menangani user yang tidak tahu pengaduannya harus
   * ditujukan kepada siapa, nanti admin yang akan menindaklanjuti pengaduan dan
   * akan diteruskan ke OPD yang berwenang".
   */
  describe('pengaduan tanpa OPD tujuan', () => {
    it('create tanpa opdId -> tersimpan ber-opdId null, tanpa memeriksa OPD', async () => {
      (prisma.complaint.create as jest.Mock).mockResolvedValue(complaintRow({ opdId: null }));

      const hasil = await service.create(
        dtoPengaduan({ opdId: undefined, judul: 'Tak tahu ke mana', uraian: 'Uraian' }),
        undefined,
        respondenUser(),
      );

      expect(hasil.opdId).toBeNull();
      // `assertOpdExists` TIDAK boleh berjalan: tak ada OPD untuk diperiksa,
      // dan memanggilnya dengan undefined berarti mencari OPD ber-id undefined.
      expect(prisma.opd.findUnique).not.toHaveBeenCalled();
      expect(prisma.complaint.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ opdId: null }) }),
      );
    });

    it('KONTROL: create DENGAN opdId tetap memeriksa OPD-nya', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5, nama: 'Dinas Kesehatan' });
      (prisma.complaint.create as jest.Mock).mockResolvedValue(complaintRow());

      await service.create(dtoPengaduan(), undefined, respondenUser());

      expect(prisma.opd.findUnique).toHaveBeenCalled();
    });

    it('status TIDAK dapat diubah sebelum diteruskan', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ opdId: null }));

      // Peran berhak penuh sekalipun ditolak: status adalah pekerjaan OPD
      // tujuan, dan belum ada OPD yang bertanggung jawab atas tiket ini.
      await expect(
        service.updateStatus(1, { status: ComplaintStatus.diverifikasi }, kabupatenUser()),
      ).rejects.toThrow(BadRequestException);
    });

    it('Admin OPD tidak dapat membacanya', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ opdId: null }));

      await expect(service.findByTicketNo('PGD20260729ABCD', opdUser(5))).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('penyaring tanpaOpd mempersempit ke opdId null', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 10, tanpaOpd: true }, kabupatenUser());

      const where = (prisma.complaint.findMany as jest.Mock).mock.calls[0][0].where;
      expect(where.AND).toEqual([{ opdId: null }]);
    });

    it('KONTROL: tanpaOpd tidak melebarkan akses warga', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);

      await service.findAll({ page: 1, limit: 10, tanpaOpd: true }, respondenUser(10));

      const where = (prisma.complaint.findMany as jest.Mock).mock.calls[0][0].where;
      // Penyaring kepemilikan TETAP ada -- filter hanya di-AND-kan.
      expect(where.userId).toBe(10);
      expect(where.AND).toEqual([{ opdId: null }]);
    });
  });

  describe('meneruskan pengaduan ke OPD (forward)', () => {
    const tanpaTujuan = () => complaintRow({ opdId: null });

    it('Admin Kabupaten berhasil: opdId terisi, audit tercatat, OPD tujuan diberi tahu', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(tanpaTujuan());
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 9, nama: 'Dinas Kesehatan' });
      const updatedRow = complaintRow({ opdId: 9 });
      (prisma.complaint.update as jest.Mock).mockResolvedValue(updatedRow);

      const hasil = await service.forward(1, { opdId: 9 }, kabupatenUser());

      expect(hasil.opdId).toBe(9);
      // `opdId: null` di syarat: penerusan hanya mengisi tujuan yang MASIH
      // kosong, juga bila dua Admin Kabupaten menekannya bersamaan (BUG-078).
      expect(prisma.complaint.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, opdId: null }, data: { opdId: 9 } }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        2,
        'forward',
        'complaint',
        expect.objectContaining({ complaintId: 1, opdId: 9 }),
      );
      // Tanpa ini OPD tujuan tak akan pernah tahu ada tiket yang menjadi
      // tanggung jawabnya -- persis keluhan 6 Agustus 2026 soal tiket baru.
      //
      // KONTRAK BERUBAH 23 Oktober 2026 (BUG-018). Baris ini dahulu menuntut
      // `notifyComplaintCreated`, dan justru itu cacatnya: fungsi tersebut
      // memegang DUA penerima, sehingga Admin Kabupaten dikabari "Pengaduan Baru
      // Masuk" untuk kedua kalinya atas tiket yang sama. Yang dituntut sekarang
      // jalur sempitnya.
      expect(notificationsService.notifyOpdTujuan).toHaveBeenCalledWith(updatedRow);
      expect(notificationsService.notifyComplaintCreated).not.toHaveBeenCalled();
      // DAN pelapor diberi tahu bahwa pengaduan "Lainnya"-nya sudah mendarat di
      // instansi berwenang (7 Oktober 2026) -- dengan NAMA OPD-nya, bukan id.
      // Argumen ketiga pelaku penerusannya, supaya ia tak mengabari dirinya.
      expect(notificationsService.notifyComplaintForwarded).toHaveBeenCalledWith(
        updatedRow,
        'Dinas Kesehatan',
        2,
      );
    });

    it('Admin Kabupaten dengan akun lain juga berhasil', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(tanpaTujuan());
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 9 });
      (prisma.complaint.update as jest.Mock).mockResolvedValue(complaintRow({ opdId: 9 }));

      await expect(service.forward(1, { opdId: 9 }, kabupatenUserLain())).resolves.toBeDefined();
    });

    /**
     * PASANGAN yang membuat dua uji di atas berarti: tanpa penolakan ini,
     * "berhasil" di atas bisa saja karena endpointnya terbuka bagi siapa pun.
     */
    it('Admin OPD DITOLAK', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(tanpaTujuan());

      await expect(service.forward(1, { opdId: 9 }, opdUser(9))).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.complaint.update).not.toHaveBeenCalled();
    });

    it('warga DITOLAK', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(tanpaTujuan());

      await expect(service.forward(1, { opdId: 9 }, respondenUser())).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('pengaduan yang SUDAH bertujuan -> BadRequest, bukan dialihkan diam-diam', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ opdId: 5 }));

      await expect(service.forward(1, { opdId: 9 }, kabupatenUser())).rejects.toThrow(
        BadRequestException,
      );
      expect(prisma.complaint.update).not.toHaveBeenCalled();
    });

    it('OPD tujuan tidak ada -> NotFound', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(tanpaTujuan());
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.forward(1, { opdId: 404 }, kabupatenUser())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('pengaduan tidak ada -> NotFound', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.forward(99, { opdId: 9 }, kabupatenUser())).rejects.toThrow(
        NotFoundException,
      );
    });

    /**
     * BUG-077: penerusan lintas tingkat mengikuti pola `alihkan` (keputusan
     * pengguna 12 November 2026). Tingkat diturunkan dari NAMA OPD tujuan.
     */
    describe('lintas tingkat (BUG-077)', () => {
      const tiketKecamatan = () =>
        complaintRow({ opdId: null, tingkat: TingkatPengaduan.kecamatan, kategori: 'kec_lainnya' });
      const DINKES = { id: 9, nama: 'Dinas Kesehatan', isActive: true };

      it('tanpa kategori baru -> BadRequest, tak ada yang ditulis', async () => {
        (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(tiketKecamatan());
        (prisma.opd.findUnique as jest.Mock).mockResolvedValue(DINKES);

        await expect(service.forward(1, { opdId: 9 }, kabupatenUser())).rejects.toThrow(
          /kategori/i,
        );
        expect(prisma.complaint.update).not.toHaveBeenCalled();
      });

      it('kategori milik tingkat lama -> BadRequest', async () => {
        (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(tiketKecamatan());
        (prisma.opd.findUnique as jest.Mock).mockResolvedValue(DINKES);

        await expect(
          service.forward(1, { opdId: 9, kategori: 'kec_lainnya' }, kabupatenUser()),
        ).rejects.toThrow(BadRequestException);
        expect(prisma.complaint.update).not.toHaveBeenCalled();
      });

      it('menulis tingkat dan kategori baru, dan mencatat keduanya di audit', async () => {
        (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(tiketKecamatan());
        (prisma.opd.findUnique as jest.Mock).mockResolvedValue(DINKES);
        (prisma.complaint.update as jest.Mock).mockResolvedValue(complaintRow({ opdId: 9 }));

        await service.forward(1, { opdId: 9, kategori: 'kab_lainnya' }, kabupatenUser());

        expect(prisma.complaint.update).toHaveBeenCalledWith(
          expect.objectContaining({
            data: { opdId: 9, tingkat: TingkatPengaduan.kabupaten, kategori: 'kab_lainnya' },
          }),
        );
        expect(audit.record).toHaveBeenCalledWith(
          2,
          'forward',
          'complaint',
          expect.objectContaining({
            tingkatLama: TingkatPengaduan.kecamatan,
            tingkatBaru: TingkatPengaduan.kabupaten,
            kategoriLama: 'kec_lainnya',
            kategoriBaru: 'kab_lainnya',
          }),
        );
      });
    });

    it('kalah balapan -> Conflict, tanpa audit dan tanpa notifikasi', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(tanpaTujuan());
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 9, nama: 'Dinas Kesehatan' });
      // `Once`: `clearAllMocks` tak mencabut implementasi, dan penolakan yang
      // menetap ikut terpanggil di uji sesudahnya sebagai janji yang tak
      // ditunggu siapa pun -- jest lalu mati dengan unhandled rejection.
      (prisma.complaint.update as jest.Mock).mockRejectedValueOnce(p2025());

      const janji = service.forward(1, { opdId: 9 }, kabupatenUser());

      await expect(janji).rejects.toThrow(ConflictException);
      await expect(janji).rejects.toThrow(PESAN_BERUBAH_SERENTAK);
      expect(audit.record).not.toHaveBeenCalled();
      expect(notificationsService.notifyOpdTujuan).not.toHaveBeenCalled();
      expect(notificationsService.notifyComplaintForwarded).not.toHaveBeenCalled();
    });
  });

  /**
   * Pengalihan pengaduan antar-instansi (5 November 2026).
   *
   * BEDANYA DARI `forward`: yang itu mengisi tujuan yang MASIH KOSONG dan tak
   * menggeser status; yang ini memindahkan tujuan yang SUDAH ADA, boleh
   * dilakukan Admin OPD pemiliknya sendiri, dan menggeser status ke
   * `dialihkan` sambil memperbaiki kategori serta tingkatnya.
   */
  describe('mengalihkan pengaduan ke instansi lain (alihkan)', () => {
    const PUPR = { id: 9, nama: 'Dinas Pekerjaan Umum dan Penataan Ruang', isActive: true };
    const WUNGU = { id: 12, nama: 'Kecamatan Wungu', isActive: true };
    const dto = (over: Record<string, unknown> = {}) => ({
      opdId: 9,
      kategori: 'kab_lainnya',
      catatan: 'Berkaitan dengan kewenangan infrastruktur.',
      ...over,
    });
    const siapkan = (
      complaint: Record<string, unknown> = complaintRow(),
      opd: Record<string, unknown> | null = PUPR,
    ) => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaint);
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue(opd);
      const updated = complaintRow({
        opdId: (opd as { id?: number })?.id ?? 9,
        status: ComplaintStatus.dialihkan,
      });
      (prisma.$transaction as jest.Mock).mockResolvedValue([updated, {}]);
      return updated;
    };

    it('memindahkan opdId, kategori, tingkat, dan status sekaligus', async () => {
      siapkan();

      await service.alihkan(1, dto(), opdUser(5));

      expect(prisma.complaint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          // Status DAN pemilik yang tadi dibaca (BUG-078): pengalihan yang
          // kalah balapan tak boleh menimpa pengalihan atau penutupan lain.
          where: { id: 1, status: ComplaintStatus.menunggu_verifikasi, opdId: 5 },
          data: expect.objectContaining({
            opdId: 9,
            kategori: 'kab_lainnya',
            tingkat: TingkatPengaduan.kabupaten,
            status: ComplaintStatus.dialihkan,
          }),
        }),
      );
    });

    it('kalah balapan -> Conflict, tanpa audit dan tanpa notifikasi', async () => {
      siapkan();
      (prisma.$transaction as jest.Mock).mockRejectedValueOnce(p2025());

      const janji = service.alihkan(1, dto(), opdUser(5));

      await expect(janji).rejects.toThrow(ConflictException);
      await expect(janji).rejects.toThrow(PESAN_BERUBAH_SERENTAK);
      expect(audit.record).not.toHaveBeenCalled();
      expect(notificationsService.notifyComplaintAlihkan).not.toHaveBeenCalled();
    });

    it('menurunkan tingkat dari NAMA OPD tujuan, bukan dari badan permintaan', async () => {
      // "Kecamatan Wungu" -> tingkat kecamatan, jadi kategorinya pun harus
      // kategori kecamatan. Tak ada medan `tingkat` di DTO yang dapat
      // bertentangan dengannya.
      siapkan(complaintRow(), WUNGU);

      await service.alihkan(1, dto({ opdId: 12, kategori: 'kec_lainnya' }), kabupatenUser());

      expect(prisma.complaint.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ tingkat: TingkatPengaduan.kecamatan }),
        }),
      );
    });

    it('menolak kategori yang bukan milik tingkat OPD tujuan', async () => {
      siapkan(complaintRow(), WUNGU);

      await expect(
        service.alihkan(1, dto({ opdId: 12, kategori: 'kab_lainnya' }), kabupatenUser()),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('menolak pengaduan tanpa tujuan dan menunjuk jalur triase', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ opdId: null }));

      await expect(service.alihkan(1, dto(), kabupatenUser())).rejects.toThrow(
        /belum diteruskan ke OPD/i,
      );
    });

    it.each([ComplaintStatus.selesai, ComplaintStatus.ditolak])(
      'menolak pengaduan berstatus %s',
      async (status) => {
        siapkan(complaintRow({ status }));

        await expect(service.alihkan(1, dto(), kabupatenUser())).rejects.toThrow(
          BadRequestException,
        );
        expect(prisma.$transaction).not.toHaveBeenCalled();
      },
    );

    it('menolak OPD tujuan yang sama dengan pemilik saat ini', async () => {
      // Tanpa penjaga ini, "mengalihkan" ke diri sendiri hanya melahirkan
      // baris riwayat yang menyatakan perpindahan yang tak pernah terjadi.
      siapkan(complaintRow({ opdId: 9 }));

      await expect(service.alihkan(1, dto({ opdId: 9 }), kabupatenUser())).rejects.toThrow(
        BadRequestException,
      );
    });

    it('menolak OPD tujuan yang nonaktif', async () => {
      // OPD nonaktif tak punya akun yang dapat masuk (opd.service.ts menyaring
      // `isActive: true` saat mencari penerima notifikasi), jadi tiketnya akan
      // duduk di sana tanpa seorang pun yang dapat menanganinya.
      siapkan(complaintRow(), { ...PUPR, isActive: false });

      await expect(service.alihkan(1, dto(), kabupatenUser())).rejects.toThrow(BadRequestException);
    });

    it('OPD tujuan tidak ada -> NotFound', async () => {
      siapkan(complaintRow(), null);

      await expect(service.alihkan(1, dto({ opdId: 404 }), kabupatenUser())).rejects.toThrow(
        NotFoundException,
      );
    });

    it('Admin OPD bukan pemilik DITOLAK', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ opdId: 5 }));

      await expect(service.alihkan(1, dto(), opdUser(7))).rejects.toThrow(ForbiddenException);
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('menulis riwayat bertujuan dengan catatan TERENKRIPSI, di transaksi yang sama', async () => {
      siapkan();

      await service.alihkan(1, dto(), opdUser(5));

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      const argumenRiwayat = (prisma.complaintStatusHistory.create as jest.Mock).mock.calls.at(-1);
      expect(argumenRiwayat?.[0].data).toMatchObject({
        complaintId: 1,
        status: ComplaintStatus.dialihkan,
        actorId: 1,
        opdTujuanId: 9,
      });
      const catatan = argumenRiwayat?.[0].data.catatan as string;
      expect(catatan.startsWith('enc:v1:')).toBe(true);
      expect(dekripsiKolom(catatan, KUNCI_UJI_KOLOM)).toBe(
        'Berkaitan dengan kewenangan infrastruktur.',
      );
    });

    it('mencatat audit alihkan dengan OPD lama dan OPD baru', async () => {
      siapkan();

      await service.alihkan(1, dto(), opdUser(5));

      expect(audit.record).toHaveBeenCalledWith(
        1,
        'alihkan',
        'complaint',
        expect.objectContaining({
          complaintId: 1,
          ticketNo: 'PGD20260729ABCD',
          opdLama: 5,
          opdBaru: 9,
          kategoriLama: 'kab_lainnya',
          kategoriBaru: 'kab_lainnya',
        }),
      );
    });

    it('memberi tahu lewat notifyComplaintAlihkan, BUKAN notifyComplaintStatusChanged', async () => {
      // Dua kabar atas satu peristiwa adalah cacat yang sama bentuknya dengan
      // BUG-018: pelapor menerima "dialihkan ke X" lalu "kini berstatus
      // Dialihkan" berturut-turut.
      const updated = siapkan();

      await service.alihkan(1, dto(), opdUser(5));

      expect(notificationsService.notifyComplaintAlihkan).toHaveBeenCalledWith(
        updated,
        PUPR.nama,
        5,
        1,
      );
      expect(notificationsService.notifyComplaintStatusChanged).not.toHaveBeenCalled();
    });
  });

  /**
   * Identitas pelapor pada detail pengaduan (1 Oktober 2026, laporan pengguna:
   * "profil pelapor pengaduan belum mengambil data profil/akun dari helpdesk").
   *
   * Sumbernya kini ada -- ketiga kolom `users` diisi dari klaim Helpdesk saat
   * login (lihat sso-identitas.mapper.ts). Yang diuji di sini: ketiganya sampai
   * ke kartu "Profil Pelapor", TIDAK ikut ke daftar, dan hilang sepenuhnya pada
   * pengaduan anonim.
   */
  describe('ComplaintsService — identitas pelapor pada detail', () => {
    const sandi = (teks: string) => enkripsiKolom(teks, KUNCI_UJI_KOLOM);

    const userLengkap = {
      nama: 'Warga Contoh',
      nik: sandi('3520041502050002'),
      nomorHp: sandi('+62895396662038'),
      alamat: sandi('Dusun Timang Desa Waduk'),
    };

    it('mendekripsi ketiganya ke dalam entity detail', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ user: userLengkap, opd: { nama: 'Dinkes' } }),
      );

      const hasil = await service.findByTicketNo('PGDX', kabupatenUser());

      expect(hasil.reporterNama).toBe('Warga Contoh');
      // TERSAMAR, bukan penuh (1 Oktober 2026). Nomor penuhnya tak pernah
      // meninggalkan server -- lihat common/identitas/nik.ts.
      expect(hasil.reporterNik).toBe('3520 04•• •••• 0002');
      expect(hasil.reporterNomorHp).toBe('+62895396662038');
      expect(hasil.reporterAlamat).toBe('Dusun Timang Desa Waduk');
    });

    /**
     * PAGAR TERPENTING perubahan ini. Uji di atas membuktikan bentuk yang
     * tersamar muncul; uji ini membuktikan bentuk PENUHNYA tidak -- di medan mana
     * pun, bukan hanya di medan yang kebetulan diperiksa.
     */
    it('nomor NIK penuh TIDAK muncul di satu medan pun', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ user: userLengkap, opd: { nama: 'Dinkes' } }),
      );

      const hasil = await service.findByTicketNo('PGDX', kabupatenUser());

      expect(JSON.stringify(hasil)).not.toContain('3520041502050002');
    });

    it('meminta ketiga kolom itu pada include-nya', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());

      await service.findByTicketNo('PGDX', kabupatenUser());

      const include = (prisma.complaint.findUnique as jest.Mock).mock.calls[0][0].include;
      expect(include.user.select).toEqual({
        nama: true,
        nik: true,
        nomorHp: true,
        alamat: true,
      });
    });

    /**
     * DAFTAR TIDAK IKUT MEMBAWANYA. Daftar pengaduan tak menggambar satu pun dari
     * ketiganya, dan menariknya untuk tiap baris berarti NIK serta alamat rumah
     * puluhan orang melintas di satu respons yang tak memerlukannya. Pembatasan
     * termurah adalah tidak mengambilnya sejak kueri.
     */
    it('daftar pengaduan tidak ikut menarik NIK maupun alamat', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[complaintRow()], 1]);

      await service.findAll({ page: 1, limit: 20 }, kabupatenUser());

      const include = (prisma.complaint.findMany as jest.Mock).mock.calls[0][0].include;
      expect(include.user.select).toEqual({ nama: true });
    });

    /**
     * Janji anonim berlaku untuk SELURUH identitas, bukan hanya namanya. Tanpa
     * uji ini, menambah tiga medan ke entity diam-diam membuka tiga jalan baru
     * yang justru paling menunjuk satu orang.
     */
    it('pengaduan anonim: ketiganya hilang SEBAGAI KUNCI, bukan diisi null', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ isAnonim: true, user: userLengkap, opd: { nama: 'Dinkes' } }),
      );

      const hasil = await service.findByTicketNo('PGDX', kabupatenUser());

      for (const kunci of ['reporterNama', 'reporterNik', 'reporterNomorHp', 'reporterAlamat']) {
        expect(Object.keys(hasil)).not.toContain(kunci);
      }
    });

    /**
     * Kolom kosong adalah keadaan NORMAL: SSO melayani ASN maupun warga umum,
     * dan tak satu pun medan ini dijamin ada. Yang kosong tak boleh menjelma
     * jadi string kosong -- tampilan membedakan "tak ada" dari "ada tapi kosong"
     * untuk memutuskan menyembunyikan barisnya.
     */
    it('kolom yang null tetap null, tidak menjadi string kosong', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ user: { nama: 'Warga Contoh', nik: null, nomorHp: null, alamat: null } }),
      );

      const hasil = await service.findByTicketNo('PGDX', kabupatenUser());

      expect(hasil.reporterNik).toBeNull();
      expect(hasil.reporterNomorHp).toBeNull();
      expect(hasil.reporterAlamat).toBeNull();
    });
  });
});
