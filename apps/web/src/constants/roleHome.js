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
  // `superuser` (2026-08-20): beranda BAKUnya sama dengan Admin Kabupaten, dipakai
  // saat pengalihan otomatis (mis. proxy dari '/'). Saat login ia justru MEMILIH
  // sendiri mau ke area mana -- lihat RoleLoginPicker.jsx.
  superuser: '/admin-kab/dashboard',
};

/**
 * Tujuan tiap pilihan pada pemilih peran superuser (2026-08-20).
 *
 * Admin OPD SENGAJA tidak diarahkan ke /admin-opd/dashboard: endpoint
 * `GET /dashboard/opd` menolak siapa pun yang bukan `Role.opd` DENGAN opdId
 * terisi (diperiksa di dalam DashboardService, jadi bypass superuser tak
 * menolong), dan superuser tak tertaut OPD mana pun. Mengarahkannya ke sana
 * hanya akan berujung 403 atau terpantul balik oleh proxy. Daftar survei
 * lintas OPD berfungsi penuh untuk superuser, jadi itulah pintu masuknya.
 */
export const SUPERUSER_AREA_HOME = {
  kabupaten: '/admin-kab/dashboard',
  opd: '/admin-opd/surveys',
  responden: '/dashboard',
};
