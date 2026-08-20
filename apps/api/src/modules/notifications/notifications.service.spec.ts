import { NotFoundException } from '@nestjs/common';
import { ComplaintStatus, NotificationType, Role } from '@prisma/client';
import type { Complaint } from '@prisma/client';
import { FULL_ACCESS_ROLES } from '../../common/auth/role.util';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

const respondenUser = (userId = 10): CurrentUser => ({ userId, role: Role.responden, opdId: null });

/**
 * Sejak superuser dipisah kembali (2026-08-20), broadcast pengawasan menyasar
 * `role: { in: [kabupaten, superuser] }` -- bukan lagi satu nilai peran. Mock
 * di bawah membedakan kueri itu lewat bentuknya, bukan mencocokkan nilai persis,
 * supaya penambahan peran berhak penuh tak perlu menyunting tiap mock lagi.
 */
const isFullAccessQuery = (where: { role?: unknown }): boolean =>
  typeof where.role === 'object' && where.role !== null && 'in' in where.role;

const complaint = (over: Partial<Complaint> = {}): Complaint =>
  ({
    id: 1,
    ticketNo: 'PGD20260805ABCD',
    userId: 10,
    opdId: 5,
    kategori: 'lainnya',
    subKategori: null,
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
        if (where.role === Role.opd) return Promise.resolve([{ id: 200 }]);
        return Promise.resolve([]);
      });

      await service.notifyComplaintCreated(complaint());

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 200,
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
          role: { in: [...FULL_ACCESS_ROLES] },
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

  describe('notifyComplaintReply', () => {
    it('responden membalas -> semua Admin OPD aktif pemilik diberi tahu (link admin-opd)', async () => {
      (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (where.role === Role.opd) return Promise.resolve([{ id: 100 }, { id: 101 }]);
        return Promise.resolve([]);
      });

      await service.notifyComplaintReply(complaint({ userId: 10, opdId: 5 }), 10);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: Role.opd, opdId: 5, isActive: true },
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
      await service.notifyComplaintReply(complaint({ userId: 10, opdId: 5 }), 999);

      expect(prisma.notification.create).toHaveBeenCalledWith({
        data: {
          userId: 10,
          type: NotificationType.complaint_reply,
          title: 'Balasan Baru pada Pengaduan',
          message: 'OPD membalas pengaduan PGD20260805ABCD Anda',
          link: '/complaints/PGD20260805ABCD',
        },
      });
    });

    it('juga memberi tahu kabupaten (oversight) siapapun yg membalas, kecuali pelakunya sendiri', async () => {
      (prisma.user.findMany as jest.Mock).mockImplementation(({ where }) => {
        if (isFullAccessQuery(where)) return Promise.resolve([{ id: 300 }]);
        return Promise.resolve([]);
      });

      await service.notifyComplaintReply(complaint({ userId: 10, opdId: 5 }), 999);

      expect(prisma.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 300,
            link: '/admin-kab/complaints/PGD20260805ABCD',
          }),
        }),
      );
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
        where: { userId: 10, isRead: false },
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
        expect.objectContaining({ where: { userId: 10, isRead: false } }),
      );
    });
  });
});
