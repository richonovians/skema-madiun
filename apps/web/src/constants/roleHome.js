/**
 * Halaman "beranda" per role backend (`kabupaten`/`opd`/`responden`) --
 * dipakai proxy.js (redirect saat akses area yang bukan haknya) DAN
 * SSOLoginButton.jsx (redirect setelah login, 2026-08-06: SEBELUMNYA cuma
 * `window.location.reload()` di halaman saat ini, admin harus navigasi
 * manual ke /admin-kab atau /admin-opd sendiri). Satu sumber kebenaran
 * supaya dua tempat ini tak diam-diam tak sinkron lagi.
 */
export const ROLE_HOME = {
  kabupaten: '/admin-kab/dashboard',
  opd: '/admin-opd/dashboard',
  responden: '/dashboard',
};
