import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { concatMap, from, Observable } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AUDIT_KEY, AuditMeta } from '../decorators/audit.decorator';
import { redactAuditBody } from './audit-redact.util';
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
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly auditService: AuditService,
    private readonly prisma: PrismaService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const meta = this.reflector.get<AuditMeta | undefined>(AUDIT_KEY, context.getHandler());
    if (!meta) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest<AuditableRequest>();
    const rekam = (sebelum?: Record<string, unknown>) =>
      next
        .handle()
        .pipe(
          concatMap((value) =>
            this.recordIfAuthenticated(request, meta, sebelum).then(() => value),
          ),
        );

    if (!meta.sebelum) {
      return rekam();
    }
    // Nilai lama dibaca SEBELUM handler berjalan (BUG-064). Pembacaan dan
    // perubahan tidak satu transaksi: dua perubahan serentak atas baris yang
    // sama dapat mencatat `sebelum` yang sama. Untuk aksi admin yang jarang
    // bertabrakan itu diterima, dan lebih baik daripada tak mencatatnya sama
    // sekali seperti sebelumnya.
    return from(this.bacaSebelum(request, meta)).pipe(concatMap((sebelum) => rekam(sebelum)));
  }

  /**
   * Best-effort, sama seperti `AuditService.record`: pembacaan yang gagal
   * TIDAK menggagalkan permintaan; barisnya tetap tercatat tanpa `sebelum`.
   * Permintaan tanpa pengguna tak akan dicatat, jadi tak perlu dibaca.
   */
  private async bacaSebelum(
    request: AuditableRequest,
    meta: AuditMeta,
  ): Promise<Record<string, unknown> | undefined> {
    if (!request.user || !meta.sebelum) {
      return undefined;
    }
    const id = Number((request.params as { id?: unknown } | undefined)?.id);
    if (!Number.isInteger(id)) {
      return undefined;
    }
    try {
      return (await meta.sebelum(this.prisma, id)) ?? undefined;
    } catch (err) {
      this.logger.warn(
        `Gagal membaca nilai lama untuk audit (${meta.entitas} #${id}): ${String(err)}`,
      );
      return undefined;
    }
  }

  /**
   * Menulis audit log SEBELUM respons dikirim ke client (bukan fire-and-forget) — jaminan
   * lebih kuat & lebih mudah diuji e2e, tanpa membuat kegagalan pencatatan menggagalkan
   * request (AuditService.record menelan errornya sendiri).
   */
  private async recordIfAuthenticated(
    request: AuditableRequest,
    meta: AuditMeta,
    sebelum?: Record<string, unknown>,
  ): Promise<void> {
    if (!request.user) {
      return;
    }
    const aksi = meta.aksi ?? inferAksi(request.method);
    // Badan permintaan DIREDAKSI sebelum masuk `audit_logs.detail` (temuan audit
    // T8, 7 September 2026): nilai identitas & teks bebas disunting, KUNCInya
    // dipertahankan supaya audit log tetap menjawab "field mana yang disentuh".
    // `params` ikut dilewatkan -- ia biasanya hanya `{ id }`, tapi melewatkannya
    // lewat fungsi yang sama berarti satu aturan, bukan dua yang bisa berbeda.
    await this.auditService.record(request.user.userId, aksi, meta.entitas, {
      params: redactAuditBody(request.params),
      body: redactAuditBody(request.body),
      ...(sebelum ? { sebelum: redactAuditBody(sebelum) } : {}),
    });
  }
}
