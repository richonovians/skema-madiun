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
  ['/admin-opd/complaints', '/', '/dashboard', '/admin-opd/complaints', '/admin-opd/complaints'],
];

export const KOLOM = { tanpaToken: 1, responden: 2, opd: 3, kabupaten: 4 };

/** Setiap halaman yang mungkin benar-benar dirender oleh sapuan matriks. */
export const RUTE_UNTUK_PEMANASAN = [...new Set(MATRIKS.flatMap((baris) => baris))];
