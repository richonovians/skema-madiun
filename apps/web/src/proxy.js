import { NextResponse } from 'next/server';

// Proxy (dulu "middleware") jalan di edge/server — tidak bisa akses localStorage,
// makanya cek token dari cookie (ditulis oleh authStorage.js saat login/logout,
// lihat src/features/authentication/services/authStorage.js).
export function proxy(request) {
  const token = request.cookies.get('token')?.value;

  if (!token) {
    const loginUrl = new URL('/', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin-kab/:path*', '/admin-opd/:path*'],
};
