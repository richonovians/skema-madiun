import { CallHandler, ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { paginate } from '../dto/paginated-result';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';
import { ResponseInterceptor } from './response.interceptor';

function mockContext(url = '/api/v1/test', statusCode = 200): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ url }),
      getResponse: () => ({ statusCode }),
    }),
  } as unknown as ExecutionContext;
}

function mockHandler(value: unknown): CallHandler {
  return { handle: () => of(value) } as unknown as CallHandler;
}

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();

  it('membungkus data biasa ke envelope tanpa pagination', async () => {
    const result: ApiSuccessResponse<unknown> = await lastValueFrom(
      interceptor.intercept(mockContext(), mockHandler({ a: 1 })),
    );

    expect(result.success).toBe(true);
    expect(result.statusCode).toBe(200);
    expect(result.data).toEqual({ a: 1 });
    expect(result.meta.path).toBe('/api/v1/test');
    expect(result.meta.pagination).toBeUndefined();
  });

  it('mengangkat PaginatedResult ke data + meta.pagination', async () => {
    const result: ApiSuccessResponse<unknown> = await lastValueFrom(
      interceptor.intercept(mockContext(), mockHandler(paginate([{ id: 1 }], 1, 1, 20))),
    );

    expect(result.data).toEqual([{ id: 1 }]);
    expect(result.meta.pagination).toEqual({ total: 1, page: 1, limit: 20, totalPages: 1 });
  });

  it('data null diubah menjadi null (bukan undefined)', async () => {
    const result: ApiSuccessResponse<unknown> = await lastValueFrom(
      interceptor.intercept(mockContext(), mockHandler(undefined)),
    );

    expect(result.data).toBeNull();
  });
});
