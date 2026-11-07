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
