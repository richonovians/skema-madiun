import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { concatMap, Observable } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';
import { AUDIT_KEY, AuditMeta } from '../decorators/audit.decorator';
import type { CurrentUser } from '../decorators/current-user.decorator';

interface AuditableRequest {
  method: string;
  params: unknown;
  body: unknown;
  user?: CurrentUser;
}

function inferAksi(method: string): string {
  switch (method) {
    case 'POST':
      return 'create';
    case 'PATCH':
    case 'PUT':
      return 'update';
    case 'DELETE':
      return 'delete';
    default:
      return method.toLowerCase();
  }
}

/**
 * Mencatat aksi admin ke audit log — HANYA untuk handler bertanda `@Audit(...)`.
 * Berjalan setelah handler sukses (tidak pernah mencatat percobaan yang gagal/ditolak
 * guard). Pencatatan sendiri best-effort lewat AuditService.record (lihat di sana).
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(AUDIT_KEY, context.getHandler());
    if (!meta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditableRequest>();
    return next
      .handle()
      .pipe(concatMap((value) => this.recordIfAuthenticated(request, meta).then(() => value)));
  }

  /**
   * Menulis audit log SEBELUM respons dikirim ke client (bukan fire-and-forget) — jaminan
   * lebih kuat & lebih mudah diuji e2e, tanpa membuat kegagalan pencatatan menggagalkan
   * request (AuditService.record menelan errornya sendiri).
   */
  private async recordIfAuthenticated(request: AuditableRequest, meta: AuditMeta): Promise<void> {
    if (!request.user) {
      return;
    }
    const aksi = meta.aksi ?? inferAksi(request.method);
    await this.auditService.record(request.user.userId, aksi, meta.entitas, {
      params: request.params,
      body: request.body,
    });
  }
}
