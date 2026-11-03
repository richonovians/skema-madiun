import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import type { AuditService } from '../../modules/audit/audit.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { PENANDA_DISUNTING } from './audit-redact.util';
import { AuditInterceptor } from './audit.interceptor';

function mockContext(request: Record<string, unknown>): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => (() => undefined) as unknown,
  } as unknown as ExecutionContext;
}

function mockHandler(value: unknown = { ok: true }): CallHandler {
  return { handle: () => of(value) } as unknown as CallHandler;
}

describe('AuditInterceptor', () => {
  const auditService = {
    record: jest.fn().mockResolvedValue(undefined),
  } as unknown as AuditService;

  const prisma = {} as PrismaService;

  const buildInterceptor = (meta: unknown) => {
    const reflector = { get: jest.fn().mockReturnValue(meta) } as unknown as Reflector;
    return { interceptor: new AuditInterceptor(reflector, auditService, prisma), reflector };
  };

  beforeEach(() => jest.clearAllMocks());

  it('tanpa metadata @Audit → tidak memanggil record, meneruskan nilai apa adanya', async () => {
    const { interceptor } = buildInterceptor(undefined);
    const result = await lastValueFrom(
      interceptor.intercept(
        mockContext({ method: 'POST', user: { userId: 1 } }),
        mockHandler({ x: 1 }),
      ),
    );
    expect(auditService.record).not.toHaveBeenCalled();
    expect(result).toEqual({ x: 1 });
  });

  it('dengan @Audit tapi tanpa user (tak terautentikasi) → tidak memanggil record', async () => {
    const { interceptor } = buildInterceptor({ entitas: 'survey' });
    await lastValueFrom(interceptor.intercept(mockContext({ method: 'POST' }), mockHandler()));
    expect(auditService.record).not.toHaveBeenCalled();
  });

  it('aksi disimpulkan dari HTTP method bila tidak diberikan eksplisit', async () => {
    const { interceptor } = buildInterceptor({ entitas: 'survey' });
    await lastValueFrom(
      interceptor.intercept(
        mockContext({ method: 'DELETE', params: { id: '1' }, body: {}, user: { userId: 7 } }),
        mockHandler(),
      ),
    );
    expect(auditService.record).toHaveBeenCalledWith(7, 'delete', 'survey', {
      params: { id: '1' },
      body: {},
    });
  });

  it('aksi eksplisit dari decorator dipakai apa adanya', async () => {
    const { interceptor } = buildInterceptor({ entitas: 'survey', aksi: 'update_status' });
    await lastValueFrom(
      interceptor.intercept(
        mockContext({
          method: 'PATCH',
          params: { id: '1' },
          body: { status: 'aktif' },
          user: { userId: 7 },
        }),
        mockHandler(),
      ),
    );
    expect(auditService.record).toHaveBeenCalledWith(7, 'update_status', 'survey', {
      params: { id: '1' },
      body: { status: 'aktif' },
    });
  });

  it('nilai asli dari handler tetap diteruskan setelah pencatatan selesai', async () => {
    const { interceptor } = buildInterceptor({ entitas: 'survey' });
    const result = await lastValueFrom(
      interceptor.intercept(
        mockContext({ method: 'POST', user: { userId: 1 } }),
        mockHandler({ id: 99, judul: 'Survei A' }),
      ),
    );
    expect(result).toEqual({ id: 99, judul: 'Survei A' });
  });

  /**
   * TEMUAN AUDIT T8 (7 September 2026). Interceptor ini dulu menyalin
   * `request.body` apa adanya, sehingga nama & email yang diketik admin pada
   * `POST /users` ikut tersalin ke `audit_logs` — tabel kedua, tanpa daftar
   * redaksi, yang dapat dibaca Admin Kabupaten lewat `GET /audit-logs`.
   */
  it('menyunting nilai pribadi pada body & params sebelum dicatat', async () => {
    const { interceptor } = buildInterceptor({ entitas: 'user' });

    await lastValueFrom(
      interceptor.intercept(
        mockContext({
          method: 'POST',
          user: { userId: 9 },
          params: { id: '42' },
          body: { nama: 'Budi Santoso', email: 'budi@example.go.id', roles: ['opd'], opdId: 3 },
        }),
        mockHandler(),
      ),
    );

    expect(auditService.record).toHaveBeenCalledWith(9, 'create', 'user', {
      params: { id: '42' },
      body: {
        // Kuncinya tetap ada: "nama diubah" harus tetap terekam...
        nama: PENANDA_DISUNTING,
        email: PENANDA_DISUNTING,
        // ...sedangkan INI justru alasan audit log ada, jadi tak disentuh.
        roles: ['opd'],
        opdId: 3,
      },
    });
  });

  it('tidak MENGUBAH request.body yang masih dipakai handler', async () => {
    // Interceptor berjalan pada objek permintaan yang hidup; menyunting di
    // tempat akan merusak permintaan yang sedang berjalan.
    const { interceptor } = buildInterceptor({ entitas: 'user' });
    const body = { nama: 'Budi Santoso' };

    await lastValueFrom(
      interceptor.intercept(
        mockContext({ method: 'PATCH', user: { userId: 9 }, params: {}, body }),
        mockHandler(),
      ),
    );

    expect(body.nama).toBe('Budi Santoso');
  });

  /**
   * BUG-064 (3 November 2026). Baris `update_status` dulu hanya menyalin
   * permintaan, jadi draf -> aktif dan ditutup -> aktif tercatat sama persis.
   * Rute yang menyatakan `sebelum` kini ikut mencatat nilai lamanya, dibaca
   * SEBELUM handler mengubah barisnya.
   */
  describe('nilai sebelum perubahan (BUG-064)', () => {
    const permintaanStatus = () => ({
      method: 'PATCH',
      params: { id: '755' },
      body: { status: 'aktif' },
      user: { userId: 7 },
    });

    it('membaca nilai lama sebelum handler berjalan dan mencatatnya sebagai `sebelum`', async () => {
      const urutan: string[] = [];
      const sebelum = jest.fn().mockImplementation(() => {
        urutan.push('baca');
        return Promise.resolve({ status: 'ditutup' });
      });
      const handler = {
        handle: () => {
          urutan.push('handler');
          return of({ id: 755 });
        },
      } as unknown as CallHandler;
      const { interceptor } = buildInterceptor({
        entitas: 'survey',
        aksi: 'update_status',
        sebelum,
      });

      const result = await lastValueFrom(
        interceptor.intercept(mockContext(permintaanStatus()), handler),
      );

      expect(urutan).toEqual(['baca', 'handler']);
      expect(sebelum).toHaveBeenCalledWith(prisma, 755);
      expect(auditService.record).toHaveBeenCalledWith(7, 'update_status', 'survey', {
        params: { id: '755' },
        body: { status: 'aktif' },
        sebelum: { status: 'ditutup' },
      });
      expect(result).toEqual({ id: 755 });
    });

    it('pembacaan yang gagal tidak menggagalkan permintaan; baris tetap tercatat tanpa `sebelum`', async () => {
      const sebelum = jest.fn().mockRejectedValue(new Error('koneksi putus'));
      const { interceptor } = buildInterceptor({ entitas: 'survey', sebelum });

      const result = await lastValueFrom(
        interceptor.intercept(mockContext(permintaanStatus()), mockHandler({ id: 755 })),
      );

      expect(result).toEqual({ id: 755 });
      expect(auditService.record).toHaveBeenCalledWith(7, 'update', 'survey', {
        params: { id: '755' },
        body: { status: 'aktif' },
      });
    });

    it('baris tak ditemukan (null) -> tanpa `sebelum`', async () => {
      const sebelum = jest.fn().mockResolvedValue(null);
      const { interceptor } = buildInterceptor({ entitas: 'survey', sebelum });

      await lastValueFrom(interceptor.intercept(mockContext(permintaanStatus()), mockHandler()));

      expect(auditService.record).toHaveBeenCalledWith(7, 'update', 'survey', {
        params: { id: '755' },
        body: { status: 'aktif' },
      });
    });

    it('tanpa user tidak membaca apa pun', async () => {
      const sebelum = jest.fn().mockResolvedValue({ status: 'draft' });
      const { interceptor } = buildInterceptor({ entitas: 'survey', sebelum });

      await lastValueFrom(
        interceptor.intercept(
          mockContext({ method: 'PATCH', params: { id: '755' }, body: {} }),
          mockHandler(),
        ),
      );

      expect(sebelum).not.toHaveBeenCalled();
      expect(auditService.record).not.toHaveBeenCalled();
    });

    it('params.id bukan bilangan bulat -> tidak membaca apa pun', async () => {
      const sebelum = jest.fn().mockResolvedValue({ status: 'draft' });
      const { interceptor } = buildInterceptor({ entitas: 'survey', sebelum });

      await lastValueFrom(
        interceptor.intercept(
          mockContext({ ...permintaanStatus(), params: { id: 'abc' } }),
          mockHandler(),
        ),
      );

      expect(sebelum).not.toHaveBeenCalled();
    });
  });
});
