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
      }
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      error: {
        code: HttpStatus[statusCode] ?? 'ERROR',
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
