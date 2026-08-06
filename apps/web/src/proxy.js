import { NextResponse } from 'next/server';
import { ROLE_HOME } from '@/constants/roleHome';

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

export function proxy(request) {
  const token = request.cookies.get('token')?.value;
  const role = request.cookies.get('role')?.value;
  const { pathname } = request.nextUrl;

  // Beranda publik (2026-08-06, laporan bug user): "ketika sudah login
  // sebagai admin ... mengakses halaman untuk warga dan halaman sebelum
  // login itu tidak bisa" -- SEBELUMNYA '/' tak pernah dijaga proxy sama
  // sekali, admin kabupaten/opd yg sudah login masih bebas buka beranda
  // publik. Responden TIDAK diarahkan paksa dari sini -- beranda tetap
  // relevan buat warga (mis. form pengaduan cepat), cuma admin yg diarahkan
  // ke area kerjanya sendiri.
  if (pathname === '/') {
    if (token && (role === 'kabupaten' || role === 'opd')) {
      return NextResponse.redirect(new URL(ROLE_HOME[role], request.url));
    }
    return NextResponse.next();
  }

  if (!token) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const isAdminKab = pathname.startsWith('/admin-kab');
  const isAdminOpd = pathname.startsWith('/admin-opd');
  const isRespondentArea = RESPONDENT_ONLY_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isAdminOpd && pathname.startsWith('/admin-opd/dashboard') && role === 'kabupaten') {
    return NextResponse.redirect(new URL(ROLE_HOME.kabupaten, request.url));
  }

  const forbidden =
    (isAdminKab && role !== 'kabupaten') ||
    (isAdminOpd && role !== 'opd' && role !== 'kabupaten') ||
    (isRespondentArea && role !== 'responden');
  if (forbidden) {
    const home = ROLE_HOME[role] ?? '/';
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/',
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
