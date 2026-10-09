/**
 * KUNCI SINGGAHAN HITUNGAN IKM, satu tempat (9 Oktober 2026).
 *
 * Dipisahkan dari `ikm.service.ts` karena sejak jalur A dipilih, kuncinya
 * dipakai DUA modul: IKM menuliskannya, dan `ResponsesService` membatalkannya
 * begitu satu jawaban masuk. Menyalin awalannya ke modul kedua berarti kelak
 * salah satu diganti dan yang lain tertinggal -- gejalanya angka basi yang
 * tidak akan terbaca sebagai kunci yang tak cocok.
 *
 * Pemilik penamaannya tetap modul IKM; `ResponsesService` hanya memanggil
 * `kunciSinggahanIkm`, tanpa pernah menyebut awalannya sendiri.
 */

/** Rata-rata nilai satu survei. Lihat `IkmService.hitungNilaiRataRata`. */
export const AWALAN_RATA = 'ikm-rata:';

/** Sebaran skor per pertanyaan. Lihat `IkmService.hitungSebaranSkor`. */
export const AWALAN_SEBARAN = 'ikm-sebaran:';

/**
 * TTL 60 detik, sama dengan statistik publik.
 *
 * Sejak pembatalan di jalur tulis ada, TTL bukan lagi penjaga kesegaran
 * melainkan JARING PENGAMAN: ia membatasi umur kunci yang pembatalannya gagal
 * (Redis kedip) atau yang basi karena jalan tulis lain yang belum terpikirkan.
 */
export const TTL_SINGGAHAN_DETIK = 60;

/**
 * Seluruh kunci singgahan milik satu survei.
 *
 * Mengembalikan daftar, bukan satu kunci, supaya penambahan hitungan
 * tersinggahkan berikutnya otomatis ikut dibatalkan tanpa menyentuh jalur
 * tulis -- tempat yang justru paling mudah terlupakan.
 */
export function kunciSinggahanIkm(surveyId: number): string[] {
  return [`${AWALAN_RATA}${surveyId}`, `${AWALAN_SEBARAN}${surveyId}`];
}
