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
  resolveUser(request: AuthRequestLike): Promise<CurrentUser | null>;
}
