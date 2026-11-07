import { SetMetadata } from '@nestjs/common';

export const ALLOW_UNSELECTED_ROLE_KEY = 'allowUnselectedRole';

/**
 * Menandai rute yang boleh diakses pemilik sesi yang BELUM memilih peran
 * (5 September 2026).
 *
 * Pemakainya `POST /auth/acting-role` dan `GET /auth/roles`. Tanpa kekecualian
 * ini akun ber-role banyak TERKURUNG -- setiap rute menolaknya 401
 * `ROLE_SELECTION_REQUIRED`, termasuk rute yang justru dipakai untuk memilih
 * peran.
 *
 * `POST /auth/logout` dan `POST /auth/logout-semua` ikut memakainya sejak
 * 7 November 2026 (audit `auth.logout.unselected-role-session-survives`).
 * Sebelumnya keluar pun ditolak 401 sebelum handler berjalan: sid tak dicabut,
 * cookie HttpOnly tak dihapus, dan sesinya hidup sampai `abs` sementara
 * frontend sudah menganggapnya keluar.
 *
 * BUKAN `@Public()`, dan bedanya penting: sesi tetap WAJIB sah dan akun tetap
 * WAJIB aktif. Yang dilonggarkan hanya keharusan `actingRole` sudah
 * terselesaikan. Rute berdekorator ini tak boleh ber-`@Roles` dan tak boleh
 * memakai `actingRole` untuk keputusan apa pun -- nilainya penampung belaka
 * (lihat `AuthProvider.resolveUserWithoutActingRole`).
 */
export const AllowUnselectedRole = () => SetMetadata(ALLOW_UNSELECTED_ROLE_KEY, true);
