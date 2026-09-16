import { Role } from '@prisma/client';

/**
 * Peran yang punya akses penuh lintas OPD.
 *
 * `superuser` dikembalikan 2026-08-20 (lihat migrasi
 * 20260820000000_readd_superuser_role). Ia mewarisi SELURUH hak `kabupaten`,
 * jadi setiap tempat yang dulu memeriksa `role === Role.kabupaten` untuk
 * memberi akses tak terbatas sekarang memakai helper ini -- supaya penambahan
 * peran berhak penuh tak lagi perlu diburu satu per satu di banyak berkas
 * (dan tak ada yang diam-diam terlewat).
 *
 * PERBEDAAN superuser vs kabupaten TIDAK ada di sini: satu-satunya beda adalah
 * akses log aktivitas, yang ditegakkan di AuditService. Alasannya ada di sana.
 */
export const FULL_ACCESS_ROLES: readonly Role[] = [Role.kabupaten];

/** `true` bila peran ini boleh menembus batas OPD (kini hanya `kabupaten`). */
export function hasFullAccess(role: Role): boolean {
  return FULL_ACCESS_ROLES.includes(role);
}
