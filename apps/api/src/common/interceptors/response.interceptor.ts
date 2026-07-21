import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PaginatedResult } from '../dto/paginated-result';
import { ApiResponseMeta, ApiSuccessResponse } from '../interfaces/api-response.interface';

/**
 * Membungkus setiap respons sukses ke envelope baku { success, statusCode, message,
 * data, meta }. Bila service mengembalikan `PaginatedResult`, `items` diangkat ke
 * `data` dan `pagination` disisipkan ke `meta.pagination`.
 *
 * Berjalan setelah ClassSerializerInterceptor sehingga `data` sudah terserialisasi.
 */
@Injectable()
export class ResponseInterceptor implements NestInterceptor<unknown, ApiSuccessResponse<unknown>> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<unknown>,
  ): Observable<ApiSuccessResponse<unknown>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<{ url: string }>();
    const response = ctx.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((payload) => {
        const meta: ApiResponseMeta = {
          timestamp: new Date().toISOString(),
          path: request.url,
        };

        let data: unknown = payload ?? null;
        if (payload instanceof PaginatedResult) {
          data = payload.items;
          meta.pagination = payload.pagination;
        }

        return {
          success: true as const,
          statusCode: response.statusCode,
          message: 'OK',
          data,
          meta,
        };
      }),
    );
  }
}
