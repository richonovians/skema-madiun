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
import { ComplaintsService } from './complaints.service';

const respondenUser = (userId = 10): CurrentUser => ({ userId, role: Role.responden, opdId: null });
const opdUser = (opdId: number | null): CurrentUser => ({ userId: 1, role: Role.opd, opdId });
const kabupatenUser = (): CurrentUser => ({ userId: 2, role: Role.kabupaten, opdId: null });

const complaintRow = (over: Record<string, unknown> = {}) => ({
  id: 1,
  ticketNo: 'PGD20260729ABCD',
  userId: 10,
  opdId: 5,
  kategori: 'infrastruktur',
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
  const service = new ComplaintsService(prisma, config);

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
        { opdId: 5, kategori: 'infrastruktur', judul: 'Jalan rusak', uraian: 'Uraian' },
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
        { opdId: 5, kategori: 'infrastruktur', judul: 'X', uraian: 'Y' },
        undefined,
        respondenUser(),
      );

      expect(result.id).toBe(1);
      expect(prisma.complaint.create).toHaveBeenCalledTimes(2);
    });

    it('tabrakan nomor tiket terus-menerus → Conflict setelah 5 percobaan', async () => {
      (prisma.opd.findUnique as jest.Mock).mockResolvedValue({ id: 5 });
      (prisma.complaint.create as jest.Mock).mockRejectedValue(p2002());

      await expect(
        service.create(
          { opdId: 5, kategori: 'infrastruktur', judul: 'X', uraian: 'Y' },
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
  });

  describe('replies', () => {
    it('listReplies: pengaduan tidak ada → NotFound', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.listReplies(1, kabupatenUser())).rejects.toThrow(NotFoundException);
    });

    it('addReply: Responden bukan pemilik → Forbidden', async () => {
      (prisma.complaint.findUnique as jest.Mock).mockResolvedValue(complaintRow({ userId: 999 }));
      await expect(service.addReply(1, { pesan: 'Halo' }, respondenUser(10))).rejects.toThrow(
        ForbiddenException,
      );
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
      const result = await service.addReply(1, { pesan: 'Halo' }, respondenUser(10));
      expect(result.pesan).toBe('Halo');
    });
  });
});
