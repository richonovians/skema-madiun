/**
 * Gerbang boot dev-login (7 November 2026).
 *
 * Di produksi `DEV_LOGIN_ENABLED` sudah diabaikan oleh konfigurasi, sehingga
 * rutenya tetap 404 apa pun nilainya. Gerbang ini tidak menambah penjagaan;
 * ia membuat KESALAHAN KONFIGURASI-nya nyaring. Orang yang menyalakan
 * dev-login di produksi hampir pasti menyalin `.env` pengembangan, dan berkas
 * yang sama kemungkinan membawa kunci, alamat, dan basis data yang juga salah.
 * Diam-diam 404 akan menyembunyikan semua itu.
 *
 * Pola yang sama dengan `periksaPenyimpanan` dan `periksaPenyimpanSesi`:
 * kelalaian yang sunyi diubah menjadi kegagalan boot, saat orang yang tepat
 * masih memperhatikan.
 */
export function periksaDevLogin(nodeEnv: string, nilai: string | undefined): void {
  if (nodeEnv !== 'production' || nilai !== 'true') {
    return;
  }
  throw new Error(
    'DEV_LOGIN_ENABLED=true tidak boleh dipakai bersama NODE_ENV=production.\n' +
      '\n' +
      'dev-login menerbitkan sesi untuk akun mana pun tanpa kata sandi, dan di ' +
      'produksi rutenya selalu ditutup. Nilai ini kemungkinan besar tersalin dari ' +
      '.env pengembangan -- periksa juga kunci, alamat, dan basis data di berkas ' +
      'yang sama.\n' +
      '\n' +
      'Hapus DEV_LOGIN_ENABLED dari lingkungan produksi.',
  );
}

/**
 * SATU-SATUNYA definisi "dev-login hidup" (16 November 2026, BUG-066).
 *
 * Dipakai dua tempat yang dulu menulis ungkapannya masing-masing:
 * `devLogin.enabled` di configuration.ts (dibaca `DevLoginGuard` dan log boot)
 * dan `AppModule`, yang memutuskan apakah `DevLoginModule` DIDAFTARKAN.
 * Keduanya harus sepakat; bila berbeda, rute bisa terdaftar tetapi ditolak
 * penjaganya -- persis keadaan yang membocorkan keberadaannya.
 *
 * Mati kecuali `DEV_LOGIN_ENABLED` persis `'true'`, dan tak pernah hidup di
 * produksi apa pun nilainya.
 */
export function devLoginAktif(env: NodeJS.ProcessEnv): boolean {
  return (env.NODE_ENV ?? 'development') !== 'production' && env.DEV_LOGIN_ENABLED === 'true';
}
