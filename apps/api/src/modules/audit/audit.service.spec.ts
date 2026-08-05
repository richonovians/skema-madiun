import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';

describe('AuditService', () => {
  const prisma = {
    auditLog: { create: jest.fn(), findMany: jest.fn(), count: jest.fn(), findUnique: jest.fn() },
    $transaction: jest.fn(),
  } as unknown as PrismaService;
  const service = new AuditService(prisma);

  beforeEach(() => jest.clearAllMocks());

  describe('record', () => {
    it('menulis baris audit_logs sesuai parameter', async () => {
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});
      await service.record(1, 'create', 'survey', { params: {}, body: { judul: 'A' } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 1,
          aksi: 'create',
          entitas: 'survey',
          detail: { params: {}, body: { judul: 'A' } },
        },
      });
    });

    it('gagal menulis → TIDAK melempar error (best-effort)', async () => {
      (prisma.auditLog.create as jest.Mock).mockRejectedValue(new Error('DB down'));
      await expect(service.record(1, 'create', 'survey', {})).resolves.toBeUndefined();
    });
  });

  describe('findAll', () => {
    it('memetakan baris + nama aktor, mengembalikan PaginatedResult', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([
        [
          {
            id: 1,
            actorId: 5,
            aksi: 'create',
            entitas: 'survey',
            detail: { body: {} },
            timestamp: new Date(),
            actor: { nama: 'Admin OPD' },
          },
        ],
        1,
      ]);

      const result = await service.findAll({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].actorNama).toBe('Admin OPD');
      expect(result.pagination.total).toBe(1);
    });

    it('filter entitas & actorId diteruskan ke where', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
      await service.findAll({ page: 1, limit: 20, entitas: 'survey', actorId: 5 });
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { entitas: 'survey', actorId: 5 } }),
      );
    });
  });

  describe('findOne', () => {
    it('tidak ditemukan → NotFound', async () => {
      (prisma.auditLog.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne(999)).rejects.toThrow(NotFoundException);
    });

    it('memetakan baris + nama aktor', async () => {
      (prisma.auditLog.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        actorId: 5,
        aksi: 'update_status',
        entitas: 'complaint',
        detail: { params: { id: '7' }, body: { status: 'diproses' } },
        timestamp: new Date(),
        actor: { nama: 'Admin OPD' },
      });

      const result = await service.findOne(1);

      expect(result.id).toBe(1);
      expect(result.actorNama).toBe('Admin OPD');
      expect(result.entitas).toBe('complaint');
      expect((result as unknown as { actor?: unknown }).actor).toBeUndefined();
    });
  });
});
