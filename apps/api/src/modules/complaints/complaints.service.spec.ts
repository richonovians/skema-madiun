import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ComplaintStatus, Prisma, Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
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
const superUser = (): CurrentUser => ({
  userId: 3,
  roles: [Role.superuser],
  actingRole: Role.superuser,
  opdId: null,
});

const complaintRow = (over: Record<string, unknown> = {}) => ({
  id: 1,
  ticketNo: 'PGD20260729ABCD',
  userId: 10,
  opdId: 5,
  kategori: 'aduan',
  judul: 'Jalan rusak',
  uraian: 'Jalan berlubang di depan kantor desa',
  status: ComplaintStatus.diterima,
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
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const config = { get: jest.fn().mockReturnValue('uploads') } as unknown as ConfigService;
  const notificationsService = {
    notifyComplaintCreated: jest.fn(),
    notifyComplaintStatusChanged: jest.fn(),
    notifyComplaintReply: jest.fn(),
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
      // berkas yatim di disk untuk pengaduan yang tak pernah ada.
      expect(prisma.opd.findUnique).not.toHaveBeenCalled();
    });
  });

  beforeEach(() => jest.clearAllMocks());

  describe('create', () => {
    it('OPD tujuan tidak ada → BadRequest', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(
        service.create(
          { opdId: 99, kategori: 'lainnya', judul: 'X', uraian: 'Y' },
          undefined,
          respondenUser(),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('lebih dari 5 lampiran → BadRequest', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      const files = Array.from({ length: 6 }, () => ({
        mimetype: 'image/png',
        size: 100,
        originalname: 'a.png',
        buffer: Buffer.from(''),
      })) as unknown as Express.Multer.File[];
      await expect(
        service.create(
          { opdId: 5, kategori: 'lainnya', judul: 'X', uraian: 'Y' },
          files,
          respondenUser(),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('tipe berkas tidak diizinkan → BadRequest', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      const files = [
        { mimetype: 'application/zip', size: 100, originalname: 'a.zip', buffer: Buffer.from('') },
      ] as unknown as Express.Multer.File[];
      await expect(
        service.create(
          { opdId: 5, kategori: 'lainnya', judul: 'X', uraian: 'Y' },
          files,
          respondenUser(),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('ukuran berkas > 5MB → BadRequest', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      const files = [
        {
          mimetype: 'image/png',
          size: 6 * 1024 * 1024,
          originalname: 'a.png',
          buffer: Buffer.from(''),
        },
      ] as unknown as Express.Multer.File[];
      await expect(
        service.create(
          { opdId: 5, kategori: 'lainnya', judul: 'X', uraian: 'Y' },
          files,
          respondenUser(),
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('sukses tanpa lampiran → ticketNo berformat PGD{tanggal}{acak}', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.complaint.create as jest.Mock).mockResolvedValue(complaintRow());

      const result = await service.create(
        { opdId: 5, kategori: 'aduan', judul: 'Jalan rusak', uraian: 'Uraian' },
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
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.complaint.create as jest.Mock)
        .mockRejectedValueOnce(p2002())
        .mockResolvedValueOnce(complaintRow());

      const result = await service.create(
        { opdId: 5, kategori: 'aduan', judul: 'X', uraian: 'Y' },
        undefined,
        respondenUser(),
      );

      expect(result.id).toBe(1);
      expect(prisma.complaint.create).toHaveBeenCalledTimes(2);
    });

    it('menyimpan isAnonim=true ke kolomnya', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.complaint.create as jest.Mock).mockResolvedValue(complaintRow({ isAnonim: true }));

      await service.create(
        { opdId: 5, kategori: 'aduan', judul: 'X', uraian: 'Y', isAnonim: true },
        undefined,
        respondenUser(),
      );

      expect(prisma.complaint.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isAnonim: true }) }),
      );
    });

    it('tanpa flag -> tersimpan false, bukan undefined', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.complaint.create as jest.Mock).mockResolvedValue(complaintRow());

      await service.create(
        { opdId: 5, kategori: 'aduan', judul: 'X', uraian: 'Y' },
        undefined,
        respondenUser(),
      );

      expect(prisma.complaint.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ isAnonim: false }) }),
      );
    });

    it('tidak lagi mengirim kolom subKategori ke Prisma', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.complaint.create as jest.Mock).mockResolvedValue(complaintRow());

      await service.create(
        { opdId: 5, kategori: 'aduan', judul: 'X', uraian: 'Y' },
        undefined,
        respondenUser(),
      );

      expect(prisma.complaint.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.not.objectContaining({ subKategori: expect.anything() }),
        }),
      );
    });

    it('tabrakan nomor tiket terus-menerus → Conflict setelah 5 percobaan', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.complaint.create as jest.Mock).mockRejectedValue(p2002());

      await expect(
        service.create(
          { opdId: 5, kategori: 'aduan', judul: 'X', uraian: 'Y' },
          undefined,
          respondenUser(),
        ),
      ).rejects.toThrow(ConflictException);
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
            user: { select: { nama: true } },
            opd: { select: { nama: true } },
          },
        }),
      );
      expect(result.reporterNama).toBe('Warga Contoh');
      expect(result.opdNama).toBe('Dinas Kesehatan');
      expect((result as unknown as { user?: unknown }).user).toBeUndefined();
      expect((result as unknown as { opd?: unknown }).opd).toBeUndefined();
    });
  });

  describe('updateStatus', () => {
    it('transisi tidak diizinkan (selesai → diproses) → BadRequest', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ status: ComplaintStatus.selesai }),
      );
      await expect(
        service.updateStatus(1, { status: ComplaintStatus.diproses }, opdUser(5)),
      ).rejects.toThrow(BadRequestException);
    });

    it('ditolak tanpa catatan → BadRequest', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());
      await expect(
        service.updateStatus(1, { status: ComplaintStatus.ditolak }, opdUser(5)),
      ).rejects.toThrow(BadRequestException);
    });

    it('Admin OPD lain → Forbidden', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ opdId: 5 }));
      await expect(
        service.updateStatus(1, { status: ComplaintStatus.diproses }, opdUser(99)),
      ).rejects.toThrow(ForbiddenException);
    });

    it('diterima → diproses (tanpa catatan) sukses, tidak membuat reply', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        complaintRow({ status: ComplaintStatus.diproses }),
      ]);

      const result = await service.updateStatus(
        1,
        { status: ComplaintStatus.diproses },
        opdUser(5),
      );

      expect(result.status).toBe(ComplaintStatus.diproses);
    });

    it('diproses → ditolak dengan catatan → transaksi menyertakan pembuatan reply', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(
        complaintRow({ status: ComplaintStatus.diproses }),
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
      expect(prisma.complaintReply.create).toHaveBeenCalledWith({
        data: { complaintId: 1, authorId: 1, pesan: 'Bukan wewenang OPD ini' },
      });
    });

    it('(D9) sukses -> memicu notifyComplaintStatusChanged dgn baris terbaru', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow());
      const updatedRow = complaintRow({ status: ComplaintStatus.diproses });
      (prisma.$transaction as jest.Mock).mockResolvedValue([updatedRow]);

      await service.updateStatus(1, { status: ComplaintStatus.diproses }, opdUser(5));

      expect(notificationsService.notifyComplaintStatusChanged).toHaveBeenCalledWith(updatedRow, 1);
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
      });
      const result = await service.addReply(1, { pesan: 'Halo' }, undefined, respondenUser(10));
      expect(result.pesan).toBe('Halo');
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
      });

      await service.addReply(1, { pesan: 'Halo' }, undefined, respondenUser(10));

      expect(notificationsService.notifyComplaintReply).toHaveBeenCalledWith(row, 10);
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
        { kategori: 'lainnya', judul: 'Tak tahu ke mana', uraian: 'Uraian' },
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
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.complaint.create as jest.Mock).mockResolvedValue(complaintRow());

      await service.create(
        { opdId: 5, kategori: 'aduan', judul: 'X', uraian: 'Y' },
        undefined,
        respondenUser(),
      );

      expect(prisma.opd.findUnique).toHaveBeenCalled();
    });

    it('status TIDAK dapat diubah sebelum diteruskan', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ opdId: null }));

      // Peran berhak penuh sekalipun ditolak: status adalah pekerjaan OPD
      // tujuan, dan belum ada OPD yang bertanggung jawab atas tiket ini.
      await expect(
        service.updateStatus(1, { status: ComplaintStatus.diproses }, kabupatenUser()),
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
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 9 });
      (prisma.complaint.update as jest.Mock).mockResolvedValue(complaintRow({ opdId: 9 }));

      const hasil = await service.forward(1, { opdId: 9 }, kabupatenUser());

      expect(hasil.opdId).toBe(9);
      expect(prisma.complaint.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1 }, data: { opdId: 9 } }),
      );
      expect(audit.record).toHaveBeenCalledWith(
        2,
        'forward',
        'complaint',
        expect.objectContaining({ complaintId: 1, opdId: 9 }),
      );
      // Tanpa ini OPD tujuan tak akan pernah tahu ada tiket yang menjadi
      // tanggung jawabnya -- persis keluhan 6 Agustus 2026 soal tiket baru.
      expect(notificationsService.notifyComplaintCreated).toHaveBeenCalled();
    });

    it('Superuser juga berhasil', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(tanpaTujuan());
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 9 });
      (prisma.complaint.update as jest.Mock).mockResolvedValue(complaintRow({ opdId: 9 }));

      await expect(service.forward(1, { opdId: 9 }, superUser())).resolves.toBeDefined();
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
  });
});
