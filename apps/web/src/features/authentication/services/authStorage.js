// Penyimpanan token sesi. Disimpan di DUA tempat dengan alasan berbeda:
// - localStorage: dibaca interceptor axios (api.js) untuk header Authorization di client.
// - cookie: dibaca middleware.js (jalan di server/edge, tak bisa akses localStorage) untuk proteksi route.
const TOKEN_KEY = 'token';

export function saveSession(token) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem('sso_logged_in', 'true');
  document.cookie = `${TOKEN_KEY}=${token}; path=/; SameSite=Lax`;
}

export function clearSession() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.setItem('sso_logged_in', 'false');
  document.cookie = `${TOKEN_KEY}=; path=/; max-age=0`;
}

export function isAuthenticated() {
  if (typeof window === 'undefined') return false;
  return Boolean(localStorage.getItem(TOKEN_KEY));
}
