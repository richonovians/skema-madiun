import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiSuccessResponse } from '../interfaces/api-response.interface';

/**
 * Membungkus setiap respons sukses ke dalam envelope baku { success, statusCode,
 * message, data, meta }. Berjalan setelah ClassSerializerInterceptor sehingga
 * `data` sudah dalam bentuk terserialisasi.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiSuccessResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiSuccessResponse<T>> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<{ url: string }>();
    const response = ctx.getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        statusCode: response.statusCode,
        message: 'OK',
        data: (data ?? null) as T,
        meta: {
          timestamp: new Date().toISOString(),
          path: request.url,
        },
      })),
    );
  }
}
