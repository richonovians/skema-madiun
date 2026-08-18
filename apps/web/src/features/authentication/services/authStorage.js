// Penyimpanan token sesi. Disimpan di DUA tempat dengan alasan berbeda:
// - localStorage: dibaca interceptor axios (api.js) untuk header Authorization di client.
// - cookie: dibaca proxy.js (jalan di server/edge, tak bisa akses localStorage) untuk proteksi route.
const TOKEN_KEY = 'token';
// `role` (2026-08-05): SEBELUMNYA hanya token yang disimpan -- proxy.js tak
// bisa membedakan peran sama sekali, sehingga Responden bisa membuka
// /admin-kab & /admin-opd (halaman terbuka, walau API-nya tetap 403 di
// backend). Disimpan cookie TERPISAH dari token, bukan didekode dari JWT,
// karena proxy.js Edge Runtime tak boleh bergantung pada isi klaim token.
const ROLE_KEY = 'role';

export function saveSession(token, role) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem('sso_logged_in', 'true');
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax`;
  if (role) {
    localStorage.setItem(ROLE_KEY, role);
    document.cookie = `${ROLE_KEY}=${role}; path=/; SameSite=Lax`;
  }
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ROLE_KEY);
  localStorage.setItem('sso_logged_in', 'false');
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
  document.cookie = `${ROLE_KEY}=; path=/; max-age=0`;
}

/**
 * Baca payload JWT (segmen tengah, base64url) tanpa memverifikasi tanda tangan
 * -- verifikasi tetap tugas backend. Di sini cuma untuk tahu `exp`, supaya UI
 * tak menampilkan status login palsu.
 * @returns {object|null} null bila token cacat/tak bisa didekode.
 */
function decodeJwtPayload(token) {
  const segments = token.split('.');
  if (segments.length !== 3) return null;
  try {
    const base64 = segments[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    // `atob` menghasilkan deretan byte, bukan teks UTF-8 -- klaim non-ASCII
    // (mis. nama ber-aksen bila kelak ditambahkan backend) akan rusak/melempar
    // kalau langsung di-JSON.parse. Byte diubah ke persen-encoding dulu, cara
    // yang cuma butuh atob + decodeURIComponent (keduanya ada di browser MAUPUN
    // jsdom, beda dari TextDecoder yang tak selalu tersedia di lingkungan tes).
    const json = decodeURIComponent(
      atob(padded)
        .split('')
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, '0')}`)
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/**
 * Token dianggap kedaluwarsa bila cacat atau `exp`-nya sudah lewat. Token tanpa
 * `exp` dianggap TIDAK kedaluwarsa -- backend selalu mengisinya (session.ttlHours,
 * default 24 jam, lihat session.module.ts), jadi ketiadaan `exp` bukan alasan
 * memaksa pengguna keluar.
 */
function isTokenExpired(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return true;
  if (typeof payload.exp !== 'number') return false;
  return payload.exp * 1000 <= Date.now();
}

/**
 * SEBELUMNYA cuma memeriksa ADA-nya token, tanpa peduli masa berlakunya
 * (laporan user 2026-08-18: "baru akses localhost sudah terlihat login padahal
 * belum login"). Token sesi lama bertahan di localStorage/cookie selamanya --
 * menutup tab, mematikan dev server, atau rebuild tidak menghapusnya, karena
 * artefak itu milik browser pada origin-nya, bukan milik aplikasi. Akibatnya
 * navbar menampilkan avatar & menu akun seolah masih login, padahal setiap
 * panggilan API pasti 401.
 *
 * Klaim JWT dibaca di SISI KLIEN saja. proxy.js sengaja tetap TIDAK mendekode
 * token (keputusan lama: Edge Runtime tak bergantung pada isi klaim, itulah
 * sebabnya cookie `role` disimpan terpisah) -- karena itu sesi basi dibersihkan
 * di sini, termasuk cookie-nya, agar keputusan proxy ikut menyusul.
 */
export function isAuthenticated() {
  if (typeof window === 'undefined') return false;
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return false;

  if (isTokenExpired(token)) {
    // Wajib clearSession(), bukan sekadar `return false`: kalau cookie `token`
    // & `role` dibiarkan, proxy.js masih menganggap sesi hidup sehingga halaman
    // /admin-* tetap terbuka walau seluruh API-nya 401 -- keadaan setengah
    // login yang justru lebih membingungkan.
    clearSession();
    return false;
  }
  return true;
}

/** Role tersimpan lokal (untuk keputusan tampilan client, mis. menu aktif). */
export function getStoredRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}
