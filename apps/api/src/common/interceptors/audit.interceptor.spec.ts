import { CallHandler, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { lastValueFrom, of } from 'rxjs';
import type { AuditService } from '../../modules/audit/audit.service';
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

  const buildInterceptor = (meta: unknown) => {
    const reflector = { get: jest.fn().mockReturnValue(meta) } as unknown as Reflector;
    return { interceptor: new AuditInterceptor(reflector, auditService), reflector };
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
});
