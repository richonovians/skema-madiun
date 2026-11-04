/**
 * OPSI PEMBANGUN DATASET BEBAN, dan ringkasan yang dicetak di sebelah angkanya.
 *
 * Terpisah dari `siapkan-data.ts` karena dua alasan: berkas itu menyambung ke
 * basis data, dan `jalankan.ts` ikut membutuhkan ringkasannya. Modul ini tanpa
 * efek samping (lihat `akun-beban.ts` untuk cacat yang lahir dari sebaliknya).
 */

export function angkaArgumen(argv: readonly string[], nama: string, baku: number): number {
  const awalan = `--${nama}=`;
  const cocok = argv.find((a) => a.startsWith(awalan));
  if (cocok === undefined) {
    return baku;
  }
  const mentah = cocok.slice(awalan.length);
  const nilai = Number(mentah);
  // `Number('')` bernilai 0, jadi `--survei=` tanpa nilai akan terbaca sebagai
  // "kosongkan saja". Ditolak tersurat.
  if (mentah === '' || !Number.isInteger(nilai) || nilai < 0) {
    throw new Error(`${awalan} menuntut bilangan bulat tak negatif, bukan '${cocok}'`);
  }
  return nilai;
}

export interface IsiTambahan {
  /** Persen respons yang menulis jawaban teks, 0..100. */
  persenTeks: number;
  pengaduanPerOpd: number;
}

/**
 * Bakunya nol: T1, T2, dan T3 di `docs/TEST_BEBAN.md` diukur tanpa jawaban teks
 * dan tanpa pengaduan, dan perintah yang sama harus tetap membangun dataset yang
 * sama supaya angkanya dapat dibandingkan.
 */
export function bacaIsiTambahan(argv: readonly string[]): IsiTambahan {
  const persenTeks = angkaArgumen(argv, 'teks', 0);
  if (persenTeks > 100) {
    throw new Error(`--teks= menuntut persen 0 sampai 100, bukan ${persenTeks}`);
  }
  return { persenTeks, pengaduanPerOpd: angkaArgumen(argv, 'pengaduan', 0) };
}

/** Tabel yang harus tak berubah selama pengukuran baca. */
export const HITUNGAN_DATASET = [
  'survey_responses',
  'answers',
  'jawaban_teks',
  'complaints',
] as const;

export type HitunganDataset = Record<(typeof HITUNGAN_DATASET)[number], number>;

export function ringkasDataset(h: HitunganDataset): string {
  const f = (n: number): string => n.toLocaleString('id-ID');
  return (
    `${f(h.survey_responses)} respons, ${f(h.answers)} jawaban ` +
    `(${f(h.jawaban_teks)} teks), ${f(h.complaints)} pengaduan`
  );
}
