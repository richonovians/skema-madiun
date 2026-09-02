import { NextResponse } from 'next/server';
import { ROLE_HOME, SUPERUSER_AREA_HOME } from '@/constants/roleHome';

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

// SUPERUSER (2026-08-20): peran terpisah yang mewarisi seluruh hak `kabupaten`
// dan boleh masuk ke SEMUA area (ia memilih sendiri mau ke mana saat login,
// lihat RoleLoginPicker.jsx). Backend memperlakukannya setara kabupaten
// (hasFullAccess di role.util.ts), jadi proxy tak boleh lebih ketat dari itu.
const FULL_ACCESS_ROLES = ['kabupaten', 'superuser'];

// Log aktivitas & manajemen pengguna HANYA superuser -- Admin Kabupaten biasa
// dipantulkan. Ini penjaga NAVIGASI, bukan pengganti penjaga data: yang
// sesungguhnya menegakkan larangan ini adalah AuditService.assertSuperuser dan
// UsersService.assertSuperuser di backend (403 walau URL-nya dipaksa). Di sini
// supaya pengguna tak mendarat di halaman yang pasti gagal memuat.
//
// `/admin-kab/users` ditambahkan 2026-08-20 atas permintaan user ("fitur
// manajemen user hanya dapat diakses oleh role superuser").
const SUPERUSER_ONLY_PREFIXES = ['/admin-kab/audit-logs', '/admin-kab/users'];

// Halaman pemilih peran: hanya relevan bagi superuser, dan HARUS tetap terbuka
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
 * menaikkan hak siapa pun, karena hanya superuser yang punya sesi superuser.
 */
const SUPERUSER_AREA_PREFIXES = {
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
  const role = request.cookies.get('role')?.value;
  const { pathname } = request.nextUrl;
  const hasFullAccess = FULL_ACCESS_ROLES.includes(role);

  // Area kerja pilihan superuser. Diabaikan untuk peran lain (peran mereka
  // sendiri sudah menentukan areanya) dan bila nilainya tak dikenal.
  const superuserArea =
    role === 'superuser' ? request.cookies.get('area')?.value : undefined;
  const areaPrefixes = superuserArea ? SUPERUSER_AREA_PREFIXES[superuserArea] : undefined;
  // OPD yang sedang diperankan superuser (cookie `opd`, ditulis authStorage.js).
  // Proxy hanya butuh tahu ADA atau TIDAK -- yang memakai nilainya adalah
  // halaman area OPD di sisi klien (`?opdId=`).
  const actingOpdId = role === 'superuser' ? request.cookies.get('opd')?.value : undefined;
  // Beranda yang dituju saat superuser dipantulkan: beranda AREA-nya, bukan
  // /admin-kab/dashboard -- memantulkannya ke luar area yang sedang dipakai
  // hanya akan dipantulkan lagi oleh aturan area di bawah (lingkaran).
  const superuserHome = areaPrefixes ? SUPERUSER_AREA_HOME[superuserArea] : ROLE_HOME.superuser;

  // Beranda publik (2026-08-06, laporan bug user): "ketika sudah login
  // sebagai admin ... mengakses halaman untuk warga dan halaman sebelum
  // login itu tidak bisa" -- SEBELUMNYA '/' tak pernah dijaga proxy sama
  // sekali, admin kabupaten/opd yg sudah login masih bebas buka beranda
  // publik. Responden TIDAK diarahkan paksa dari sini -- beranda tetap
  // relevan buat warga (mis. form pengaduan cepat), cuma admin yg diarahkan
  // ke area kerjanya sendiri.
  if (pathname === '/') {
    // Superuser yang sedang memakai area WARGA tidak dipaksa keluar dari beranda
    // publik -- beranda itu bagian dari pengalaman warga yang sedang ia buka
    // (perlakuan sama seperti peran `responden`).
    if (token && superuserArea === 'responden') {
      return NextResponse.next();
    }
    if (token && role === 'superuser') {
      return NextResponse.redirect(new URL(superuserHome, request.url));
    }
    if (token && (hasFullAccess || role === 'opd')) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
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
      : NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/', request.url));
  }
  if (perluPersetujuan) {
    return NextResponse.redirect(new URL(CONSENT_PATH, request.url));
  }

  // Pemilih peran: satu-satunya jalan superuser berpindah area tanpa logout,
  // jadi TIDAK boleh ikut terkena kurungan area di bawah. Peran lain tak punya
  // apa pun untuk dipilih di sana.
  if (isUnder(pathname, ROLE_PICKER_PATH)) {
    return role === 'superuser'
      ? NextResponse.next()
      : NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/', request.url));
  }

  const isAdminKab = pathname.startsWith('/admin-kab');
  const isAdminOpd = pathname.startsWith('/admin-opd');
  const isRespondentArea = RESPONDENT_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  // Superuser ikut dipantulkan dari /admin-opd/dashboard: `getOpdDashboard`
  // menuntut `Role.opd` DENGAN opdId terisi (diperiksa di dalam service, bukan
  // lewat @Roles), dan superuser tak tertaut OPD mana pun -- jadi ia pun akan 403.
  if (isAdminOpd && pathname.startsWith('/admin-opd/dashboard') && hasFullAccess) {
    // SUPERUSER kini boleh (2026-08-20, keputusan user: "hanya superuser yang
    // bisa membuka dashboard opd") ASALKAN sudah memilih OPD -- backend menuntut
    // `?opdId=` darinya dan menolak 400 tanpa itu, jadi tanpa pilihan OPD
    // halaman ini pasti gagal memuat dan lebih baik dipantulkan.
    //
    // Admin Kabupaten TETAP dipantulkan: `resolveDashboardOpdId` menolaknya 403
    // dengan atau tanpa parameter. Dashboard lintas-OPD miliknya ada di
    // /admin-kab/dashboard.
    const superuserMayOpen = role === 'superuser' && actingOpdId != null;
    if (!superuserMayOpen) {
      // Superuser dipantulkan ke beranda AREA-nya, bukan selalu /admin-kab: kalau
      // ia sedang terkurung di area OPD, memantulkannya ke admin-kab hanya akan
      // dipantulkan lagi oleh aturan area di bawah.
      const home = role === 'superuser' ? superuserHome : ROLE_HOME[role];
      return NextResponse.redirect(new URL(home, request.url));
    }
    // Sengaja TIDAK `return next()` di sini: kurungan area & pemeriksaan
    // `forbidden` di bawah harus tetap berjalan, supaya superuser yang sedang
    // memakai area kabupaten/warga tak bisa menyelinap ke sini hanya karena
    // cookie OPD-nya masih tertinggal.
  }

  // Hanya superuser: Admin Kabupaten biasa dipantulkan ke berandanya.
  if (SUPERUSER_ONLY_PREFIXES.some((prefix) => isUnder(pathname, prefix)) && role !== 'superuser') {
    return NextResponse.redirect(new URL(ROLE_HOME[role] ?? '/', request.url));
  }

  // Kurungan area superuser (2026-08-20). Berlaku HANYA bila ia sudah memilih
  // area: sesi lama tanpa cookie `area` dibiarkan seperti sebelumnya (bebas
  // ketiga area) daripada tiba-tiba terpantul dari halaman yang sedang dibuka.
  if (areaPrefixes && !areaPrefixes.some((prefix) => isUnder(pathname, prefix))) {
    return NextResponse.redirect(new URL(superuserHome, request.url));
  }

  const forbidden =
    (isAdminKab && !hasFullAccess) ||
    (isAdminOpd && role !== 'opd' && !hasFullAccess) ||
    // Superuser boleh menengok area warga (ia memang bisa memilih masuk sebagai
    // warga). Catatan penting ada di RoleLoginPicker.jsx: datanya TIDAK disaring
    // per warga, karena backend memberi superuser cakupan penuh.
    (isRespondentArea && role !== 'responden' && role !== 'superuser');
  if (forbidden) {
    const home = role === 'superuser' ? superuserHome : (ROLE_HOME[role] ?? '/');
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
