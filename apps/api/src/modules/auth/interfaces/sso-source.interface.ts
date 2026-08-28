/**
 * Profil pengguna hasil SSO, sudah dinormalkan dari klaim Helpdesk.
 *
 * `groups` & `role` dibawa MENTAH dan sengaja belum dipakai untuk menentukan
 * peran/OPD: `claims_supported` Helpdesk mencantumkan keduanya, tetapi BENTUK
 * NILAINYA belum dikonfirmasi (apakah `groups` memuat id tenant yang sama dengan
 * `GET /api/tenants`?). Menebak bentuknya berarti memetakan peran secara salah —
 * risiko yang tak sepadan. Lihat SsoService.provision.
 */
export interface SsoProfile {
  /** Klaim `sub` — identitas stabil, disimpan ke `users.ssoSubject`. */
  sub: string;
  email: string | null;
  nama: string | null;
  groups: unknown;
  role: unknown;
}

/**
 * Kontrak percakapan OAuth2 dengan penyedia identitas — batas abstraksi (seam)
 * yang sama gayanya dengan `OpdSource`. Implementasi nyata: HelpdeskSsoClient.
 * Dipisahkan supaya `SsoService` (tempat logika provisioning & rekonsiliasi yang
 * paling berisiko berada) dapat diuji tanpa satu pun panggilan jaringan.
 */
export interface SsoSource {
  /** URL tujuan pengalihan pengguna ke halaman login penyedia. */
  buildAuthorizeUrl(state: string): Promise<string>;

  /** Tukar `code` dari callback menjadi profil pengguna. */
  exchangeCodeForProfile(code: string): Promise<SsoProfile>;
}
