import { NotFoundException } from '@nestjs/common';
import { ComplaintStatus, NotificationType, Role } from '@prisma/client';
import type { Complaint } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from './notifications.service';

const respondenUser = (userId = 10): CurrentUser => ({ userId, role: Role.responden, opdId: null });

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

  beforeEach(() => jest.clearAllMocks());

  describe('notifyComplaintStatusChanged', () => {
    it('membuat notifikasi utk pelapor dgn label status & link yg benar', async () => {
      await service.notifyComplaintStatusChanged(complaint({ status: ComplaintStatus.diproses }));

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

    it('gagal membuat notifikasi TIDAK melempar error (efek samping, bukan aksi utama)', async () => {
      (prisma.notification.create as jest.Mock).mockRejectedValueOnce(new Error('DB down'));
      await expect(service.notifyComplaintStatusChanged(complaint())).resolves.toBeUndefined();
    });
  });

  describe('notifyComplaintReply', () => {
    it('responden membalas -> semua Admin OPD aktif pemilik diberi tahu (link admin-opd)', async () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 100 }, { id: 101 }]);

      await service.notifyComplaintReply(complaint({ userId: 10, opdId: 5 }), 10);

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { role: Role.opd, opdId: 5, isActive: true },
        select: { id: true },
      });
      expect(prisma.notification.create).toHaveBeenCalledTimes(2);
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

      expect(prisma.user.findMany).not.toHaveBeenCalled();
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
