/** @type {import('next').NextConfig} */
const nextConfig = {
  // Origin selain localhost yang boleh memakai dev server (2026-08-27).
  //
  // WAJIB sejak aplikasi diakses lewat reverse proxy di `http://skema.local`
  // (lihat infra/nginx/dev.conf). Next.js 16 menolak permintaan dev yang membawa
  // header `Origin` asing, dan gejalanya sangat menyesatkan: halaman tetap
  // membalas 200 dan HTML-nya tampil utuh, tapi WebSocket HMR ditolak sehingga
  // React TAK PERNAH TERHIDRASI -- tak satu pun onClick/useEffect berjalan.
  // Tanpa baris ini, halaman /sso/callback menggantung selamanya di
  // "Menyelesaikan proses masuk..." karena efeknya tak pernah dijalankan.
  //
  // Hanya berpengaruh di `next dev`; build produksi tak memakainya.
  allowedDevOrigins: ['skema.local'],

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

module.exports = nextConfig;
