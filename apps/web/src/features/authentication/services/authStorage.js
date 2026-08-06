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

export function isAuthenticated() {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(TOKEN_KEY));
}

/** Role tersimpan lokal (untuk keputusan tampilan client, mis. menu aktif). */
export function getStoredRole() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ROLE_KEY);
}
