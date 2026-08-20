import { NextResponse } from 'next/server';
import { ROLE_HOME, SUPERUSER_AREA_HOME } from '@/constants/roleHome';

// Proxy (dulu "middleware") jalan di edge/server — tidak bisa akses localStorage,
// makanya cek token dari cookie (ditulis oleh authStorage.js saat login/logout,
// lihat src/features/authentication/services/authStorage.js).
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
//   backend-nya HARUS `Role.opd` murni (`DashboardService.getOpdDashboard`
//   cek eksplisit `user.role !== Role.opd`, bukan cuma decorator @Roles yg
//   bisa dilewati bypass) -- kabupaten diarahkan ke dashboard globalnya sendiri
//   (/admin-kab/dashboard, sudah py agregat lintas-OPD yg setara) drpd
//   menampilkan 403 mentah dari sub-halaman itu saja.
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
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('role')?.value;
  const { pathname } = request.nextUrl;
  const hasFullAccess = FULL_ACCESS_ROLES.includes(role);

  // Area kerja pilihan superuser. Diabaikan untuk peran lain (peran mereka
  // sendiri sudah menentukan areanya) dan bila nilainya tak dikenal.
  const superuserArea =
    role === 'superuser' ? request.cookies.get('area')?.value : undefined;
  const areaPrefixes = superuserArea ? SUPERUSER_AREA_PREFIXES[superuserArea] : undefined;
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
    // Superuser dipantulkan ke beranda AREA-nya, bukan selalu /admin-kab: kalau
    // ia sedang terkurung di area OPD, memantulkannya ke admin-kab hanya akan
    // dipantulkan lagi oleh aturan area di bawah.
    const home = role === 'superuser' ? superuserHome : ROLE_HOME[role];
    return NextResponse.redirect(new URL(home, request.url));
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
