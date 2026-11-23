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

/** Tanggal kalender; `bulan` ditulis 1-12, bukan 0-11 seperti `Date`. */
export interface TanggalKalender {
  tahun: number;
  bulan: number;
  tanggal: number;
}

/**
 * Instan awal hari (00.00 WIB) dari sebuah tanggal kalender WIB. Dipakai untuk
 * penyaring tanggal yang datang sebagai teks `YYYY-MM-DD`: `new Date(teks)`
 * menghasilkan tengah malam UTC, yaitu 07.00 WIB, di server mana pun.
 *
 * Bukan `new Date(tahun, bulan - 1, tanggal)`: konstruktor itu memakai zona
 * proses, dan pagar zona di spec tak dapat menangkapnya karena ia tak memanggil
 * metode prototipe apa pun. Yang menjaganya hanya uji nilai di bawah `TZ=UTC`.
 */
export function awalTanggalWib(tahun: number, bulan: number, tanggal: number): Date {
  return new Date(Date.UTC(tahun, bulan - 1, tanggal) - SELISIH_WIB_MS);
}

/** Tanggal kalender WIB dari sebuah instan. */
export function tanggalWib(sekarang: Date): TanggalKalender {
  // Geser ke jam dinding WIB, lalu baca komponennya sebagai UTC.
  const wib = new Date(sekarang.getTime() + SELISIH_WIB_MS);
  return { tahun: wib.getUTCFullYear(), bulan: wib.getUTCMonth() + 1, tanggal: wib.getUTCDate() };
}

export function awalHariWib(sekarang: Date): Date {
  const { tahun, bulan, tanggal } = tanggalWib(sekarang);
  return awalTanggalWib(tahun, bulan, tanggal);
}
