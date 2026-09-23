/** @type {import('next').NextConfig} */
const nextConfig = {
  // Direktori keluaran build dapat dipindah lewat lingkungan (23 September 2026).
  //
  // ADA KARENA UJI E2E. Suite Playwright selama ini diuji terhadap `next dev`,
  // yang mengompilasi tiap rute saat PERTAMA diminta. Itu melahirkan perlombaan
  // antara uji dan kompilator: tiga lari penuh berturut-turut menghasilkan
  // 1/0/3 kegagalan, semuanya berbunyi "halaman belum siap" -- lembar gaya
  // belum berlaku, klik kehabisan waktu, panel tak pernah terbuka. Build
  // produksi tak punya kompilasi saat diminta sama sekali, jadi kelas cacat itu
  // lenyap alih-alih diperkecil.
  //
  // MENGAPA LEWAT LINGKUNGAN, BUKAN DIPAKU. `next build` menimpa `.next` milik
  // `next dev` yang sedang berjalan, dan akibatnya seluruh rute menjadi 404 --
  // jebakan yang sudah pernah memakan waktu di proyek ini. Dengan
  // `NEXT_DIST_DIR=.next-e2e`, build untuk pengujian mendarat di direktorinya
  // sendiri dan milik server pengembangan tak pernah tersentuh.
  //
  // Bakunya tetap `.next`, jadi tak ada alur kerja yang berubah bagi siapa pun
  // yang tidak menyetel variabel ini.
  distDir: process.env.NEXT_DIST_DIR || '.next',

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
  //
  // Rentang alamat privat ditambahkan (29 Agustus 2026) supaya aplikasi bisa
  // DIPAKAI dari perangkat lain di Wi-Fi yang sama -- terutama ponsel, yang tak
  // punya berkas hosts sehingga tak bisa memakai `skema.local` dan harus
  // mengetik alamat IP laptop pengembang.
  //
  // Tanpa entri ini gejalanya persis seperti yang diperingatkan di atas, dan
  // sangat menyesatkan: halaman terbuka, CSS-nya termuat, tampilannya normal --
  // tapi jabat tangan WebSocket HMR ditolak ("Invalid status line") sehingga
  // React tak pernah terhidrasi dan TAK SATU PUN tombol berfungsi.
  //
  // Sengaja POLA, bukan alamat tertentu. Menuliskan IP satu laptop berarti
  // menitipkan alamat jaringan seorang pengembang ke dalam riwayat git, dan
  // tetap saja rusak begitu DHCP memberi alamat baru atau pengembang lain
  // mencoba hal yang sama. Pola ini tak perlu disunting siapa pun.
  //
  // Cakupannya tetap sempit dan tak menambah risiko yang berarti: hanya rentang
  // privat RFC 1918 (mustahil dirutekan dari internet), hanya berlaku di
  // `next dev`, dan tak pernah ikut ke build produksi.
  //
  // Kalau jaringan Anda memakai rentang privat ketiga (172.16-31.x.x, mis.
  // sebagian hotspot ponsel), tambahkan polanya di sini -- glob-nya tak bisa
  // menyatakan rentang 16-31, jadi sengaja tak dipukul rata `172.*.*.*` yang
  // ikut mencakup alamat publik.
  //
  // `172.24.*.*` ditambahkan 31 Agustus 2026: jaringan kantor Dinas Kominfo
  // memberi alamat 172.24.200.x, tepat pada rentang ketiga yang diperingatkan di
  // atas. Tanpa entri ini menguji tampilan dari ponsel di Wi-Fi kantor gagal
  // dengan gejala yang persis seperti dijelaskan -- halaman terbuka dan rapi,
  // tapi tak satu pun tombol berfungsi.
  allowedDevOrigins: ['skema.local', '192.168.*.*', '10.*.*.*', '172.24.*.*'],

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
