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
 *
 * Bulan statistik pengaduan (BUG-100, 25 November 2026) ikut aturan ini:
 * `periodeFromDate` dan `trenBulanan` memakai `tanggalWib`, dan agregat
 * Postgres-nya (`DashboardService.agregatPengaduanBulanan`) memakai
 * `ZONA_WIB`. Begitu pula batas bulan tren responden dasbor OPD
 * (`DashboardService.getRespondentTrendPercent`, BUG-101) dan jam jalan
 * pemangkasan log audit serta pemusnahan survei Sampah (`jedaKeJamWib`,
 * BUG-102).
 */
const JAM_MS = 60 * 60 * 1000;
const SELISIH_WIB_MS = 7 * JAM_MS;

/**
 * Nama zona WIB untuk Postgres (`AT TIME ZONE`), dipakai kueri yang membagi
 * waktu per hari atau per bulan di sisi basis data. Nama IANA, BUKAN `'+07'`:
 * Postgres membaca singkatan berbentuk POSIX dengan tanda terbalik, sehingga
 * `'UTC+7'` di sana berarti tujuh jam di BARAT Greenwich. Asia/Jakarta tak
 * mengenal waktu musim panas sejak 1964, jadi hasilnya sama dengan selisih
 * tujuh jam yang dipaku di atas.
 */
export const ZONA_WIB = 'Asia/Jakarta';

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

/**
 * Milidetik dari `sekarang` sampai pukul `jam`.00 WIB berikutnya, untuk tugas
 * terjadwal harian yang harus berjalan di jam sepi (BUG-102, 25 November
 * 2026). Tepat pada jamnya menunggu sehari penuh, bukan nol: jeda nol membuat
 * timer menembak seketika lalu menjadwalkan ulang dirinya tanpa henti.
 */
export function jedaKeJamWib(sekarang: Date, jam: number): number {
  const jeda = awalHariWib(sekarang).getTime() + jam * JAM_MS - sekarang.getTime();
  return jeda > 0 ? jeda : jeda + 24 * JAM_MS;
}

export function awalHariWib(sekarang: Date): Date {
  const { tahun, bulan, tanggal } = tanggalWib(sekarang);
  return awalTanggalWib(tahun, bulan, tanggal);
}
