import { SetMetadata } from '@nestjs/common';
import type { PrismaService } from '../../prisma/prisma.service';

export const AUDIT_KEY = 'audit';

/**
 * Pembaca nilai lama satu baris, dipanggil `AuditInterceptor` SEBELUM handler
 * mengubahnya. Kembalikan hanya kolom yang perlu dapat ditelusuri (mis.
 * `{ status }`), bukan seluruh baris -- hasilnya masuk `audit_logs.detail`.
 * `null` berarti barisnya tak ditemukan; tak ada yang dicatat.
 */
export type PembacaSebelum = (
  prisma: PrismaService,
  id: number,
) => Promise<Record<string, unknown> | null>;

export interface AuditMeta {
  entitas: string;
  /** Bila kosong, disimpulkan dari HTTP method (POST=create, PATCH/PUT=update, DELETE=delete). */
  aksi?: string;
  /**
   * Bila ada, nilai lama baris ber-`params.id` dicatat sebagai `detail.sebelum`
   * (BUG-064, 3 November 2026). Hanya untuk rute yang perubahannya tak dapat
   * dibaca dari permintaannya saja, seperti `update_status`.
   */
  sebelum?: PembacaSebelum;
}

/**
 * Menandai handler sebagai aksi admin yang harus dicatat ke audit log.
 * Dibaca `AuditInterceptor` (global) setelah handler sukses — TIDAK pernah
 * menggagalkan request utama meski pencatatan gagal (lihat AuditService.record).
 */
export const Audit = (entitas: string, aksi?: string, sebelum?: PembacaSebelum) =>
  SetMetadata(AUDIT_KEY, { entitas, aksi, sebelum });
