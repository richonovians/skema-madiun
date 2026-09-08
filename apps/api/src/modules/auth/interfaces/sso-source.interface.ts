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
  /**
   * Klaim `email_verified` — pernyataan penyedia identitas bahwa email itu
   * benar milik pemegang akun. `null` berarti klaimnya TIDAK ADA, dan itu
   * dibedakan dari `false` dengan sengaja: keduanya sama-sama menghalangi
   * penautan akun (lihat SsoService.provision), tapi hanya yang `null` yang
   * dapat dilonggarkan sakelar darurat, karena hanya `null` yang berarti
   * "belum diketahui" alih-alih "sudah dinyatakan tidak".
   */
  emailVerified: boolean | null;
  nama: string | null;
  groups: unknown;
  role: unknown;
  /**
   * SELURUH klaim userinfo, apa adanya (8 September 2026).
   *
   * Dibawa mentah karena field yang membawa OPD seorang ASN belum diketahui
   * bentuk maupun namanya, dan pengguna belum memiliki contoh payload. Nama
   * field-nya dikonfigurasi lewat `HELPDESK_SSO_OPD_CLAIM`; tanpa klaim mentah
   * di sini, konfigurasi itu tak punya apa pun untuk dibaca.
   *
   * TIDAK disimpan ke basis data dan tidak ikut ke log: yang dicatat hanya
   * NAMA-NAMA field-nya saat pencocokan gagal (lihat SsoService), supaya data
   * pribadi tak tersalin ke tabel maupun berkas log.
   */
  klaim: Record<string, unknown>;
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
