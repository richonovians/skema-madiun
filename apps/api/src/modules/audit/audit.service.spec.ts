import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import type { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PENANDA_DISUNTING } from '../../common/interceptors/audit-redact.util';
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
      await service.record(1, 'create', 'survey', { params: {}, body: { periode: '2026-Q1' } });
      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 1,
          aksi: 'create',
          entitas: 'survey',
          detail: { params: {}, body: { periode: '2026-Q1' } },
        },
      });
    });

    /**
     * 22 September 2026. Redaksi T8 dulu hidup HANYA di `AuditInterceptor`,
     * jadi setiap pemanggil `record()` secara langsung melewatinya sepenuhnya --
     * dan ada satu: `SsoService` menulis `sub` Helpdesk apa adanya saat sebuah
     * akun lahir memegang peran kabupaten.
     *
     * Yang keliru bukan pemanggil yang lupa, melainkan TEMPAT redaksinya
     * dipasang. Selama ia berada di interceptor, setiap pemanggil baru harus
     * mengingat sendiri -- kegagalan yang sunyi, dan yang bocor justru detail
     * pemberian wewenang tertinggi. Sejak redaksinya di sini, tak ada lagi
     * jalan lain menuju `audit_logs.detail`.
     */
    it('menyunting `detail` SENDIRI, tidak bergantung pada pemanggilnya', async () => {
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await service.record(1, 'sso_grant_kabupaten', 'auth', {
        email: 'budi@example.go.id',
        roles: [Role.kabupaten],
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 1,
          aksi: 'sso_grant_kabupaten',
          entitas: 'auth',
          // Peran yang diberikan TETAP terbaca: itu seluruh alasan baris ini ada.
          detail: { email: PENANDA_DISUNTING, roles: [Role.kabupaten] },
        },
      });
    });

    /**
     * Interceptor tetap menyunting lebih dulu, jadi jalur teraudit melewati
     * redaksi DUA KALI. Ini menyatakan bahwa itu aman -- tanpanya, memindahkan
     * redaksi ke sini adalah taruhan pada sifat yang tak pernah diperiksa.
     */
    it('redaksi ganda tidak merusak apa pun', async () => {
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({});

      await service.record(1, 'create', 'complaint', {
        params: {},
        body: { judul: PENANDA_DISUNTING, kategori: 'aduan' },
      });

      expect(prisma.auditLog.create).toHaveBeenCalledWith({
        data: {
          actorId: 1,
          aksi: 'create',
          entitas: 'complaint',
          detail: { params: {}, body: { judul: PENANDA_DISUNTING, kategori: 'aduan' } },
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
