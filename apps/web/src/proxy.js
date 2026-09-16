import { NextResponse } from 'next/server';
import { ROLE_HOME } from '@/constants/roleHome';

// Proxy (dulu "middleware") jalan di edge/server — tidak bisa akses localStorage,
// makanya cek sesi dari cookie: `token` (jalur dev-login, ditulis authStorage.js)
// atau `session` (jalur SSO, ditulis backend sebagai HttpOnly). Lihat catatan di
// dalam `proxy()` dan src/features/authentication/services/authStorage.js.
//
// Role-guard (2026-08-05): SEBELUMNYA hanya memeriksa ADA-TIDAKNYA token --
// siapa pun yang login (termasuk Responden) bisa membuka /admin-kab &
// /admin-opd, walau setiap panggilan API-nya tetap ditolak 403 oleh backend.
// Backend TIDAK PERNAH bocor (RolesGuard sudah benar) -- ini murni memperbaiki
// UX supaya pengguna diarahkan ke area yang berhak, bukan melihat halaman
// admin kosong/error karena semua fetch-nya 403.
//
// REVISI (2026-08-06, laporan bug user):
// - kabupaten (= superuser, bypass RolesGuard penuh di backend) SEBELUMNYA
//   diblokir total dari /admin-opd -- padahal kabupaten memang berhak lihat
//   pengaduan/survei per-OPD (lihat opd-scope.util.ts, assertOpdAccess selalu
//   meloloskan kabupaten). Kini diizinkan, KECUALI /admin-opd/dashboard yang
//   ditolak backend untuk kabupaten (`DashboardService.resolveDashboardOpdId`,
//   diperiksa di dalam service karena decorator @Roles bisa dilewati bypass) --
//   kabupaten diarahkan ke dashboard globalnya sendiri (/admin-kab/dashboard,
//   sudah py agregat lintas-OPD yg setara) drpd menampilkan 403 mentah dari
//   sub-halaman itu saja. SUPERUSER kini boleh membukanya (2026-08-20, keputusan
//   user) selama sudah memilih OPD -- lihat catatan di dalam `proxy()`.
// - Halaman warga (/dashboard, /complaints, /surveys, /profile) SEBELUMNYA
//   TIDAK PERNAH dijaga sama sekali (di luar matcher lama) -- Admin OPD/
//   Kabupaten bisa membuka halaman pengaduan warga & mengirim balasan lewat
//   antarmuka chat warga (backend `POST /complaints/:id/replies` memang
//   mengizinkan role opd utk pengaduan OPD-nya, tapi BUKAN lewat halaman
//   warga -- itu jalur admin sendiri di /admin-opd/complaints/:id). Kini
//   dijaga juga, khusus role `responden`.
//
// `ROLE_HOME` (2026-08-06) dipindah ke constants/roleHome.js -- dipakai
// bersama SSOLoginButton.jsx (redirect setelah login, sebelumnya cuma
// reload halaman saat ini, admin harus navigasi manual sendiri).
const RESPONDENT_ONLY_PREFIXES = ['/dashboard', '/complaints', '/surveys', '/profile'];

// `superuser` DILEBUR ke `kabupaten` (15 September 2026). Log aktivitas &
// manajemen pengguna kini milik Admin Kabupaten, dan karena keduanya berada di
// bawah `/admin-kab` yang memang miliknya, tak ada lagi prefiks yang perlu
// dijaga terpisah di sini -- `SUPERUSER_ONLY_PREFIXES` dibuang bersama perannya.
const FULL_ACCESS_ROLES = ['kabupaten'];

// Halaman pemilih peran: relevan bagi akun ber-peran jamak, dan HARUS tetap terbuka
// walau ia sedang terkurung di satu area (itu satu-satunya jalan berpindah tanpa
// logout).
const ROLE_PICKER_PATH = '/pilih-peran';

/**
 * Gerbang persetujuan UU PDP (2026-08-27). Hanya relevan bagi `responden` yang
 * belum menyetujui, dan HARUS tetap terbuka bagi mereka — ia satu-satunya jalan
 * keluar dari kurungan di bawah.
 *
 * Sifatnya perlu dinyatakan terus terang, sama seperti cookie `area`: ini
 * pembatas NAVIGASI, bukan pembatas hak. Cookie `consent` bisa disunting
 * pemiliknya sendiri, dan itu tak melewati apa pun — backend menolak 403 di
 * titik pengumpulan datanya sendiri (ConsentService.assertConsented pada
 * POST /complaints & POST /surveys/:id/responses). Menyunting cookie ini hanya
 * menghasilkan halaman yang gagal mengirim, bukan pengiriman tanpa persetujuan.
 */
const CONSENT_PATH = '/persetujuan';

/**
 * Prefiks yang boleh dibuka superuser per area kerja pilihannya (cookie `area`,
 * ditulis RoleLoginPicker.jsx) -- 2026-08-20, permintaan user: "jika superuser
 * login sebagai warga hanya dapat mengakses semua halaman warga, jika login
 * sebagai admin opd hanya dapat mengakses semua halaman opd, dan jika login
 * sebagai admin kabupaten hanya dapat mengakses semua halaman kabupaten."
 *
 * Sebelum ini superuser bebas berpindah ke ketiga area sekaligus dalam satu sesi.
 * Perlu dinyatakan jujur: pembatasan ini NAVIGASI, bukan hak akses. Backend tetap
 * memperlakukan superuser setara kabupaten (`hasFullAccess` di role.util.ts),
 * dan cookie `area` bisa disunting pemiliknya sendiri -- yang memang tak
 * menaikkan hak siapa pun, karena hanya pemilik peran itu yang punya sesinya.
 */
const ROLE_PREFIXES = {
  kabupaten: ['/admin-kab'],
  opd: ['/admin-opd'],
  responden: RESPONDENT_ONLY_PREFIXES,
};

/** Cocok bila path SAMA dengan prefiks atau berada di bawahnya (bukan sekadar berawalan sama). */
function isUnder(pathname, prefix) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function proxy(request) {
  // DUA nama cookie, dua jalur login (2026-08-27):
  // - `token`   : jalur dev-login, ditulis JavaScript (authStorage.saveSession).
  // - `session` : jalur SSO Helpdesk, ditulis BACKEND sebagai HttpOnly. Tak dapat
  //   dibaca JavaScript -- tapi proxy ini berjalan di edge/server, dan di sana
  //   HttpOnly tak menghalangi apa pun. Justru itu sebabnya jalur SSO tetap bisa
  //   dijaga proxy tanpa menyalin token ke cookie kedua yang terbaca skrip.
  //
  // Proxy hanya butuh tahu ADA atau TIDAK; keabsahan tokennya ditegakkan backend
  // pada setiap panggilan API (SessionAuthProvider), bukan di sini.
  const token = request.cookies.get('token')?.value ?? request.cookies.get('session')?.value;
  // Cookie `role` kini berarti PERAN YANG SEDANG DIPAKAI (5 September 2026).
  // Cookie `area` & `opd` sudah tak ada -- setiap sesi punya TEPAT SATU peran
  // yang dipakai, jadi tak ada lagi kasus "superuser bebas ketiga area".
  const role = request.cookies.get('role')?.value;
  const { pathname } = request.nextUrl;
  const hasFullAccess = FULL_ACCESS_ROLES.includes(role);
  const prefixes = ROLE_PREFIXES[role];
  const home = ROLE_HOME[role] ?? '/';

  // Beranda publik (2026-08-06, laporan bug user): "ketika sudah login
  // sebagai admin ... mengakses halaman untuk warga dan halaman sebelum
  // login itu tidak bisa" -- SEBELUMNYA '/' tak pernah dijaga proxy sama
  // sekali, admin kabupaten/opd yg sudah login masih bebas buka beranda
  // publik. Responden TIDAK diarahkan paksa dari sini -- beranda tetap
  // relevan buat warga (mis. form pengaduan cepat), cuma admin yg diarahkan
  // ke area kerjanya sendiri.
  if (pathname === '/') {
    // Yang sedang memakai peran WARGA tidak dipaksa keluar dari beranda publik
    // -- beranda itu bagian dari pengalaman warga, termasuk bagi akun ber-role
    // banyak yang sedang memakai peran itu.
    if (token && (hasFullAccess || role === 'opd')) {
      return NextResponse.redirect(new URL(home, request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Gerbang persetujuan PDP. Diperiksa SEBELUM kurungan area & pemeriksaan
  // `forbidden` di bawah, karena warga yang belum menyetujui memang tak boleh
  // sampai ke sana -- dan halaman ini sendiri harus tetap terbuka untuknya.
  const perluPersetujuan = role === 'responden' && request.cookies.get('consent')?.value !== '1';
  if (isUnder(pathname, CONSENT_PATH)) {
    // Yang tak berkepentingan (sudah menyetujui, atau bukan warga) dipantulkan
    // ke berandanya. Halaman itu sendiri memeriksa ulang lewat GET /auth/me,
    // jadi cookie basi tak bisa membuka gerbang maupun mengurung selamanya.
    return perluPersetujuan
      ? NextResponse.next()
      : NextResponse.redirect(new URL(home, request.url));
  }
  if (perluPersetujuan) {
    return NextResponse.redirect(new URL(CONSENT_PATH, request.url));
  }

  // Pemilih peran: satu-satunya jalan berpindah peran tanpa logout, jadi TIDAK
  // boleh ikut terkena kurungan di bawah.
  //
  // SELALU diloloskan bagi siapa pun bersesi, dan itu keputusan sadar: proxy
  // tak tahu berapa role sebuah akun (cookie hanya membawa peran yang DIPAKAI,
  // dan mendekode token dilarang di Edge Runtime). Halamannya sendiri
  // memeriksa lewat `GET /auth/me` dan memantulkan akun ber-role tunggal --
  // lapis jujur yang sudah ada sejak 20 Agustus.
  if (isUnder(pathname, ROLE_PICKER_PATH)) {
    return NextResponse.next();
  }

  const isAdminKab = pathname.startsWith('/admin-kab');
  const isAdminOpd = pathname.startsWith('/admin-opd');
  const isRespondentArea = RESPONDENT_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  // Dashboard OPD menuntut peran `opd` DENGAN opdId terisi, dan itu ditegakkan
  // DI DALAM DashboardService (bukan lewat @Roles). Sejak hak mengikuti peran
  // yang dipakai, siapa pun yang membukanya dengan peran lain pasti 403 -- jadi
  // dipantulkan di sini alih-alih menampilkan halaman yang pasti gagal memuat.
  //
  // Superuser yang ingin membukanya harus MEMILIKI role `opd` beserta tautan
  // OPD-nya, lalu berpindah ke peran itu. Kemampuan lamanya (memerankan OPD
  // mana pun tanpa tautan) memang dihapus -- keputusan pengguna 5 Sep 2026.
  if (pathname.startsWith('/admin-opd/dashboard') && role !== 'opd') {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Kurungan per PERAN YANG DIPAKAI. Dulu berlaku khusus superuser dan hanya
  // bila ia sudah memilih area; sekarang berlaku untuk semua, karena setiap
  // sesi selalu punya tepat satu peran yang dipakai.
  if (prefixes && !prefixes.some((prefix) => isUnder(pathname, prefix))) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  // Lapis kedua, sesudah kurungan di atas. Sengaja dipertahankan: ia menangkap
  // peran yang TIDAK punya entri di ROLE_PREFIXES (mis. nilai cookie asing)
  // -- fail-safe, bukan daftar putih yang lupa diperbarui.
  const forbidden =
    (isAdminKab && !hasFullAccess) ||
    (isAdminOpd && role !== 'opd') ||
    (isRespondentArea && role !== 'responden');
  if (forbidden) {
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
    '/pilih-peran',
    '/persetujuan',
    '/admin-kab/:path*',
    '/admin-opd/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/complaints',
    '/complaints/:path*',
    '/surveys',
    '/surveys/:path*',
    '/profile',
    '/profile/:path*',
  ],
};
