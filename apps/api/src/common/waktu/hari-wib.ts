/**
 * Awal hari kalender menurut WIB (UTC+7), sebagai instan (23 November 2026).
 *
 * WIB, BUKAN JAM SERVER. Warganya di Kabupaten Madiun sementara server
 * produksi lazim berjalan dalam UTC, dan di sana `setHours(0, 0, 0, 0)` jatuh
 * pada 07.00 WIB: selama tujuh jam setiap hari keduanya berbeda tanggal.
 *
 * Selisihnya DIPAKU, tidak dibaca dari zona waktu proses: zona server bukan
 * keterangan tentang di mana warganya tinggal, dan WIB tidak mengenal waktu
 * musim panas. Karena itu hanya metode `getUTC*` yang dipakai; satu metode
 * berwaktu lokal sudah cukup untuk membawa zona proses kembali masuk
 * (`hari-wib.spec.ts` menjaganya).
 *
 * Pola yang sama sudah hidup di `tanggal-kejadian.util.ts`,
 * `cadangan-terjadwal.service.ts`, dan `notifications.service.ts`; ketiganya
 * belum dipindahkan ke sini.
 */
const SELISIH_WIB_MS = 7 * 60 * 60 * 1000;

export function awalHariWib(sekarang: Date): Date {
  // Geser ke jam dinding WIB, potong ke tengah malam, lalu geser balik.
  const wib = new Date(sekarang.getTime() + SELISIH_WIB_MS);
  const tengahMalamWib = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate());
  return new Date(tengahMalamWib - SELISIH_WIB_MS);
}
