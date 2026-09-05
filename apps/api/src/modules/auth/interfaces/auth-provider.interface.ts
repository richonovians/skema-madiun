import type { CurrentUser } from '../../../common/decorators/current-user.decorator';

/** Bentuk minimal request yang dibutuhkan untuk me-resolve pengguna. */
export interface AuthRequestLike {
  headers: Record<string, string | string[] | undefined>;
}

/**
 * Kontrak resolusi identitas pengguna — batas abstraksi (seam) autentikasi.
 * Implementasi: StubAuthProvider (dev) sekarang; SsoAuthProvider (OIDC) nanti.
 * Modul bisnis & RolesGuard hanya bergantung pada kontrak ini, bukan detail SSO.
 */
export interface AuthProvider {
  /**
   * Identitas LENGKAP, termasuk peran yang sedang dipakai.
   *
   * Boleh MELEMPAR `UnauthorizedException` (5 September 2026): sesi yang sah
   * tapi belum memilih peran adalah keadaan tersendiri, bukan "tak ada
   * pengguna" -- dan `null` tak dapat membedakan keduanya.
   */
  resolveUser(request: AuthRequestLike): Promise<CurrentUser | null>;

  /**
   * Identitas TANPA menuntut peran sudah terpilih. HANYA untuk rute
   * `@AllowUnselectedRole()` -- yaitu satu-satunya rute yang dipakai untuk
   * MEMILIH peran. Tanpa ini akun ber-role banyak terkurung: setiap rute
   * menolaknya 401, termasuk rute yang seharusnya melepaskannya.
   *
   * `actingRole` yang dikembalikannya adalah PENAMPUNG (`roles[0]`) dan tak
   * boleh dipakai untuk keputusan hak akses apa pun.
   */
  resolveUserWithoutActingRole(request: AuthRequestLike): Promise<CurrentUser | null>;
}
