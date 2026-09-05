import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ApiErrorResponse } from '../interfaces/api-response.interface';

interface HttpResponseLike {
  status(code: number): { json(body: unknown): void };
}

interface HttpRequestLike {
  url: string;
  method: string;
}

/**
 * Menangkap SEMUA exception (HttpException maupun error tak terduga) dan
 * mengembalikannya dalam envelope error yang konsisten. Error 5xx dicatat penuh
 * (dengan stack) melalui Logger bawaan NestJS; 4xx dicatat sebagai warning.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<HttpRequestLike>();
    const response = ctx.getResponse<HttpResponseLike>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let details: unknown = null;
    /**
     * Kode galat KHAS yang disebutkan exception-nya sendiri (5 September 2026).
     *
     * Sebelum ini `error.code` SELALU nama status HTTP, sehingga dua keadaan
     * yang sama-sama 401 tapi menuntut penanganan BERLAWANAN tak dapat
     * dibedakan klien: "sesi mati" (buang sesi, minta login ulang) versus
     * "peran belum dipilih" (sesi masih sah, cukup arahkan ke pemilih peran).
     *
     * Cadangannya tetap perilaku lama, jadi tak ada respons yang berubah
     * kecuali exception yang memang menyebutkan kodenya.
     */
    let code: string | null = null;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const record = res as Record<string, unknown>;
        const rawMessage = record.message;
        message = Array.isArray(rawMessage)
          ? 'Validation failed'
          : ((rawMessage as string) ?? exception.message);
        details = rawMessage ?? record.error ?? null;
        if (typeof record.code === 'string' && record.code) {
          code = record.code;
        }
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error: {
        code: code ?? HttpStatus[statusCode] ?? 'ERROR',
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    const logLine = `${request.method} ${request.url} -> ${statusCode}: ${message}`;
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(logLine, exception instanceof Error ? exception.stack : undefined);
    } else {
      this.logger.warn(logLine);
    }

    response.status(statusCode).json(body);
  }
}
