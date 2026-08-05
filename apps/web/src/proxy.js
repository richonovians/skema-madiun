import { NextResponse } from 'next/server';

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
const ROLE_HOME = {
  kabupaten: '/admin-kab/dashboard',
  opd: '/admin-opd/dashboard',
  responden: '/dashboard',
};

export function proxy(request) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  const role = request.cookies.get('role')?.value;
  const { pathname } = request.nextUrl;
  const isAdminKab = pathname.startsWith('/admin-kab');
  const isAdminOpd = pathname.startsWith('/admin-opd');

  const forbidden = (isAdminKab && role !== 'kabupaten') || (isAdminOpd && role !== 'opd');
  if (forbidden) {
    const home = ROLE_HOME[role] ?? '/';
    return NextResponse.redirect(new URL(home, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin-kab/:path*', '/admin-opd/:path*'],
};
