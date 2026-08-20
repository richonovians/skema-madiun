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
 * Beranda AMAN tiap area superuser (2026-08-20) -- dipakai proxy sebagai tujuan
 * pantulan saat ia menyentuh halaman di luar areanya.
 *
 * Area OPD di sini SENGAJA daftar survei, bukan dashboard, dan itu bukan sisa
 * pembatasan lama: nilai ini juga menjadi tujuan pantulan ketika superuser
 * membuka /admin-opd/dashboard TANPA memilih OPD. Kalau isinya dashboard itu
 * sendiri, pantulan akan menuju halaman yang memantulkan lagi -- lingkaran
 * pengalihan tanpa akhir. Pintu masuk setelah memilih OPD memakai
 * `SUPERUSER_OPD_ENTRY` di bawah.
 */
export const SUPERUSER_AREA_HOME = {
  kabupaten: '/admin-kab/dashboard',
  opd: '/admin-opd/surveys',
  responden: '/dashboard',
};

/**
 * Halaman pertama yang dibuka superuser setelah MEMILIH OPD (2026-08-20,
 * keputusan user: hanya superuser yang bisa membuka dashboard OPD).
 *
 * Dashboard OPD kini berfungsi untuknya karena `GET /dashboard/opd` menerima
 * `?opdId=` dari peran superuser (lihat DashboardService.resolveDashboardOpdId).
 * Dipisah dari `SUPERUSER_AREA_HOME.opd` demi alasan di catatan di atas.
 */
export const SUPERUSER_OPD_ENTRY = '/admin-opd/dashboard';
