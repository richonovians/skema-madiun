import { ALAMAT_SITUS, HALAMAN_PUBLIK } from '@/constants/situs';

/**
 * robots.txt (25 September 2026). Sebelumnya tak ada sama sekali.
 *
 * MENOLAK SECARA BAKU, lalu mengizinkan empat halaman publik satu per satu.
 * Kebalikannya -- mengizinkan semuanya lalu melarang yang privat -- tampak
 * lebih ramah tetapi salah arah di sini: setiap halaman privat BARU akan dapat
 * dirayapi sampai ada yang ingat menambahkannya ke daftar larangan. Dengan
 * tolak-dulu, yang terlupakan hanyalah halaman publik baru menjadi tak terlihat
 * sampai seseorang menambahkannya. Untuk sistem yang menyimpan pengaduan warga
 * beserta nama dan nomor teleponnya, kelalaian jenis kedua jauh lebih murah.
 *
 * Ini TIDAK menggantikan autentikasi. robots.txt hanya permintaan sopan yang
 * dipatuhi perayap yang tertib; ia tak menahan siapa pun. Yang menahan tetap
 * proxy.js dan penjaga di backend.
 */
export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        // JANGKAR `$` WAJIB, dan ini bukan kerapian. Pola robots.txt
        // dicocokkan sebagai AWALAN, jadi `Allow: /` tanpa jangkar mengizinkan
        // SELURUH situs dan membatalkan `Disallow: /` di bawahnya -- versi
        // pertama berkas ini persis begitu, dan uji pencocokan di
        // __tests__/judul-dan-pengindeksan.test.js yang menangkapnya. Tanpa
        // jangkar, `Allow: /about` juga membuka `/about-apa-pun` beserta
        // seluruh anaknya.
        //
        // Kalau ada perayap yang tak mengenal `$` (ia perluasan Google/Bing,
        // bukan standar asli), `/$` dibacanya sebagai jalur harfiah yang tak
        // pernah cocok, sehingga yang berlaku tinggal `Disallow: /`. Gagalnya
        // ke arah tertutup, dan itu arah yang benar di sini.
        allow: HALAMAN_PUBLIK.map((jalur) => `${jalur}$`),
        disallow: ['/'],
      },
    ],
    sitemap: `${ALAMAT_SITUS}/sitemap.xml`,
  };
}
