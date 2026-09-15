import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from './audit.service';

// Log aktivitas untuk Admin Kabupaten. Sampai 15 September 2026 pemiliknya
// `superuser`, peran yang kini dilebur ke `kabupaten`; pemeriksaan lapis service
// ikut berpindah bersamanya. Karena itu setiap pemanggilan butuh user.
const KABUPATEN = {
  userId: 2,
  roles: [Role.kabupaten],
  actingRole: Role.kabupaten,
  opdId: null,
} as CurrentUser;
const RESPONDEN = {
  userId: 4,
  roles: [Role.responden],
  actingRole: Role.responden,
  opdId: null,
} as CurrentUser;
const OPD = { userId: 3, roles: [Role.opd], actingRole: Role.opd, opdId: 7 } as CurrentUser;

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

      const result = await service.findAll({ page: 1, limit: 20 }, KABUPATEN);

      expect(result.items).toHaveLength(1);
      expect(result.items[0].actorNama).toBe('Admin OPD');
      expect(result.pagination.total).toBe(1);
    });

    it('filter entitas & actorId diteruskan ke where', async () => {
      (prisma.$transaction as jest.Mock).mockResolvedValue([[], 0]);
      await service.findAll({ page: 1, limit: 20, entitas: 'survey', actorId: 5 }, KABUPATEN);
      expect(prisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { entitas: 'survey', actorId: 5 } }),
      );
    });
  });

  // LAPIS KEDUA, di bawah `@Roles(Role.kabupaten)` di controller. Ia tetap
  // berlaku bila daftar dekorator kelak diperluas keliru -- dan justru itu
  // gunanya, karena perluasan seperti itu tak memunculkan galat apa pun.
  // Gerbang guard-nya diuji di test/audit.e2e-spec.ts.
  //
  // Arah ujinya BERBALIK pada 15 September 2026: sebelumnya di sinilah
  // `kabupaten` ditolak, karena log aktivitas milik `superuser` seorang.
  describe('pembatasan peran', () => {
    it('opd → Forbidden, query TAK dijalankan', async () => {
      await expect(service.findAll({ page: 1, limit: 20 }, OPD)).rejects.toThrow(
        ForbiddenException,
      );
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('responden → Forbidden', async () => {
      await expect(service.findAll({ page: 1, limit: 20 }, RESPONDEN)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('findOne oleh opd → Forbidden sebelum menyentuh basis data', async () => {
      await expect(service.findOne(1, OPD)).rejects.toThrow(ForbiddenException);
      expect(prisma.auditLog.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('tidak ditemukan → NotFound', async () => {
      (prisma.auditLog.findUnique as jest.Mock).mockResolvedValue(null);
      await expect(service.findOne(999, KABUPATEN)).rejects.toThrow(NotFoundException);
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

      const result = await service.findOne(1, KABUPATEN);

      expect(result.id).toBe(1);
      expect(result.actorNama).toBe('Admin OPD');
      expect(result.entitas).toBe('complaint');
      expect((result as unknown as { actor?: unknown }).actor).toBeUndefined();
    });
  });
});
