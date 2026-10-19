import { Role } from '@prisma/client';

/**
 * Peran yang punya akses penuh lintas OPD.
 *
 * Daftar ini lahir 2026-08-20, ketika `superuser` dikembalikan sebagai peran
 * tersendiri (migrasi 20260820000000_readd_superuser_role) dan mewarisi seluruh
 * hak `kabupaten`. Setiap tempat yang dulu memeriksa `role === Role.kabupaten`
 * untuk memberi akses tak terbatas dialihkan ke helper ini -- supaya penambahan
 * peran berhak penuh tak lagi perlu diburu satu per satu di banyak berkas (dan
 * tak ada yang diam-diam terlewat).
 *
 * `superuser` DILEBUR kembali ke `kabupaten` 15 September 2026 dan nilai
 * enumnya dibuang, jadi daftarnya kini berisi satu peran. Gunanya tidak hilang:
 * ia tetap SATU-SATUNYA definisi "boleh menembus batas OPD".
 *
 * Docblock ini sempat menyatakan satu-satunya beda superuser vs kabupaten
 * adalah akses log aktivitas "yang ditegakkan di AuditService". Keduanya tak
 * lagi benar: log aktivitas justru milik `kabupaten`, dan tak ada peran kedua
 * untuk dibedakan (dibereskan 14 Oktober 2026).
 */
export const FULL_ACCESS_ROLES: readonly Role[] = [Role.kabupaten];

/** `true` bila peran ini boleh menembus batas OPD (kini hanya `kabupaten`). */
export function hasFullAccess(role: Role): boolean {
  return FULL_ACCESS_ROLES.includes(role);
}
