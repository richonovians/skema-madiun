/**
 * Matriks proteksi route — sumber tunggal bagi spec yang memeriksanya dan bagi
 * pemanasan di globalSetup. Salinan kedua pasti menyimpang cepat atau lambat.
 *
 * Isinya menyalin TEST_CASES §A.5.1.
 */

/** `[rute, tanpaToken, responden, opd, kabupaten]` — nilai = pathname yang seharusnya terbuka. */
export const MATRIKS = [
  ['/', '/', '/', '/admin-opd/dashboard', '/admin-kab/dashboard'],
  ['/dashboard', '/', '/dashboard', '/admin-opd/dashboard', '/admin-kab/dashboard'],
  ['/complaints', '/', '/complaints', '/admin-opd/dashboard', '/admin-kab/dashboard'],
  ['/surveys', '/', '/surveys', '/admin-opd/dashboard', '/admin-kab/dashboard'],
  ['/profile', '/', '/profile', '/admin-opd/dashboard', '/admin-kab/dashboard'],
  ['/admin-kab/dashboard', '/', '/dashboard', '/admin-opd/dashboard', '/admin-kab/dashboard'],
  ['/admin-opd/dashboard', '/', '/dashboard', '/admin-opd/dashboard', '/admin-kab/dashboard'],
  // Kolom `kabupaten` pada baris ini BERUBAH 15 September 2026, dari
  // `/admin-opd/complaints` menjadi `/admin-kab/dashboard`.
  //
  // Sampai peran jamak (`62e9cdc`), tabel area di `proxy.js` bernama
  // `SUPERUSER_AREA_PREFIXES` dan hanya berlaku bagi superuser yang sudah
  // memilih area; peran `kabupaten` biasa boleh menengok `/admin-opd/*` kecuali
  // dashboard-nya (keputusan 6 Agustus 2026). Tabel itu kini bernama
  // `ROLE_PREFIXES` dan berlaku bagi SETIAP peran, dengan
  // `kabupaten: ['/admin-kab']` — jadi seluruh area OPD tertutup baginya.
  //
  // Sejalan dengan rancangan peran jamak: yang butuh area OPD berganti peran,
  // bukan menembus batas areanya. Perlu dicatat, komentar panjang di
  // `proxy.js` baris 16-26 MASIH menerangkan kelonggaran lama itu — kodenya
  // sudah berubah, keterangannya belum (lihat CAT di BUG_REPORTS).
  ['/admin-opd/complaints', '/', '/dashboard', '/admin-opd/complaints', '/admin-kab/dashboard'],
];

export const KOLOM = { tanpaToken: 1, responden: 2, opd: 3, kabupaten: 4 };

/** Setiap halaman yang mungkin benar-benar dirender oleh sapuan matriks. */
export const RUTE_UNTUK_PEMANASAN = [...new Set(MATRIKS.flatMap((baris) => baris))];
