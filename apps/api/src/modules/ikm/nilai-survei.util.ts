import { MetodeNilai, TujuanSurvei } from '@prisma/client';
import { NilaiSurveiEntity } from './entities/nilai-survei.entity';

/**
 * Aturan hitung NILAI SURVEI untuk survei custom (8 Oktober 2026). Satu tempat,
 * murni, tanpa akses basis data: masukannya rata-rata jawaban skala yang sudah
 * dihitung `IkmService.hitungNilaiRataRata`, keluarannya objek siap tampil.
 * Rumus IKM (PermenPANRB 14/2017) tidak ada di sini dan tidak disentuh.
 *
 * Skala SELALU 1-4. Metode hanya mengatur tampilan angka; jawaban yang sama
 * dapat dibaca dengan kedua metode, jadi mengganti metode survei yang sedang
 * berjalan tidak menghitung ulang apa pun.
 */
const SKALA_MIN = 1;
const SKALA_MAKS = 4;

const TUJUAN_BAWAAN = TujuanSurvei.kepuasan;
const METODE_BAWAAN = MetodeNilai.rata_rata;

/**
 * Kamus kata kategori, urut dari rata-rata terendah. Batasnya SEPEREMPAT-
 * SEPEREMPAT dari rentang 1-4 dan sama untuk semua OPD, supaya "Puas" berarti
 * angka yang sama di tiap survei dan hasil antar-survei dapat dibandingkan.
 */
const KATEGORI: Record<TujuanSurvei, [string, string, string, string]> = {
  [TujuanSurvei.kepuasan]: ['Tidak Puas', 'Kurang Puas', 'Puas', 'Sangat Puas'],
  [TujuanSurvei.evaluasi]: ['Kurang', 'Cukup', 'Baik', 'Sangat Baik'],
  [TujuanSurvei.penilaian]: ['Kurang', 'Cukup', 'Baik', 'Sangat Baik'],
};

/** Batas atas (INKLUSIF) tiga kategori pertama; di atasnya kategori keempat. */
const BATAS_ATAS = [1.75, 2.5, 3.25];

/** Nama angka pada metode indeks persen; metode rata_rata selalu "Nilai Survei". */
const JUDUL_INDEKS: Record<TujuanSurvei, string> = {
  [TujuanSurvei.kepuasan]: 'Indeks Kepuasan',
  [TujuanSurvei.evaluasi]: 'Indeks Evaluasi',
  [TujuanSurvei.penilaian]: 'Indeks Penilaian',
};

const bulat2 = (x: number): number => Math.round(x * 100) / 100;

/**
 * @param rataRata rata-rata semua jawaban skala (1-4), atau `null` bila belum ada
 *   satu pun. `null` menghasilkan `null` -- bukan "0", yang akan terbaca sebagai
 *   hasil terburuk.
 * @param tujuan `null` (baris lama atau fixture) dibaca `kepuasan`.
 * @param metode `null` dibaca `rata_rata`.
 *
 * Rata-rata di luar 1-4 dijepit (data lama yang menyimpang tidak boleh
 * menghasilkan persen di atas 100). Pembulatan 2 desimal terjadi SEBELUM
 * memilih kategori, sehingga angka yang tampil dan kategorinya selalu
 * sependapat: 1,749 tampil "1,75" dan masuk kategori terendah, bukan kedua.
 */
export function hitungNilaiSurvei(
  rataRata: number | null,
  tujuan: TujuanSurvei | null,
  metode: MetodeNilai | null,
): NilaiSurveiEntity | null {
  if (rataRata === null) {
    return null;
  }
  const tujuanPakai = tujuan ?? TUJUAN_BAWAAN;
  const metodePakai = metode ?? METODE_BAWAAN;

  const rata = bulat2(Math.min(SKALA_MAKS, Math.max(SKALA_MIN, rataRata)));
  const indeks = BATAS_ATAS.findIndex((batas) => rata <= batas);
  const kategori = KATEGORI[tujuanPakai][indeks === -1 ? 3 : indeks];

  if (metodePakai === MetodeNilai.indeks_persen) {
    // Persen PENUH, bukan dibulatkan ke bilangan bulat: rata-rata dua desimal x 25
    // selalu kelipatan 0,25, jadi paling banyak dua desimal. Dibulatkan ke bulat,
    // 1,75 dan 1,76 sama-sama "44%" tetapi berkategori beda (batas kategori jatuh
    // di 43,75 / 62,5 / 81,25) -- angka dan kategorinya tak lagi sependapat.
    const persen = bulat2((rata / SKALA_MAKS) * 100);
    return new NilaiSurveiEntity({
      judul: JUDUL_INDEKS[tujuanPakai],
      nilai: persen,
      tampilan: `${String(persen).replace('.', ',')}%`,
      kategori,
    });
  }
  return new NilaiSurveiEntity({
    judul: 'Nilai Survei',
    nilai: rata,
    tampilan: `${rata.toFixed(2).replace('.', ',')} / ${SKALA_MAKS}`,
    kategori,
  });
}
