import { SetMetadata } from '@nestjs/common';

export const AUDIT_KEY = 'audit';

export interface AuditMeta {
  entitas: string;
  /** Bila kosong, disimpulkan dari HTTP method (POST=create, PATCH/PUT=update, DELETE=delete). */
  aksi?: string;
}

/**
 * Menandai handler sebagai aksi admin yang harus dicatat ke audit log.
 * Dibaca `AuditInterceptor` (global) setelah handler sukses — TIDAK pernah
 * menggagalkan request utama meski pencatatan gagal (lihat AuditService.record).
 */
export const Audit = (entitas: string, aksi?: string) => SetMetadata(AUDIT_KEY, { entitas, aksi });
