/**
 * Pilihan TUJUAN dan METODE NILAI survei custom (8 Oktober 2026).
 *
 * Nilai-nilainya (`kepuasan`, `rata_rata`, ...) adalah enum backend apa adanya;
 * di sini hanya label dan keterangan untuk pemilihnya. Angka hasil sungguhan
 * datang dari backend sebagai `nilaiSurvei` dan frontend tidak pernah
 * menghitungnya (aturannya satu tempat:
 * apps/api/src/modules/ikm/nilai-survei.util.ts).
 */
export const TUJUAN_SURVEI = [
  {
    nilai: 'kepuasan',
    label: 'Kepuasan',
    keterangan: 'Mengukur seberapa puas responden. Kategori: Tidak Puas sampai Sangat Puas.',
  },
  {
    nilai: 'evaluasi',
    label: 'Evaluasi',
    keterangan: 'Mengevaluasi kualitas layanan atau kegiatan. Kategori: Kurang sampai Sangat Baik.',
  },
  {
    nilai: 'penilaian',
    label: 'Penilaian',
    keterangan: 'Penilaian umum terhadap suatu objek. Kategori: Kurang sampai Sangat Baik.',
  },
];

export const METODE_NILAI = [
  {
    nilai: 'rata_rata',
    label: 'Nilai rata-rata',
    keterangan: 'Rata-rata jawaban pada skala 1-4, mis. 3,40 / 4.',
  },
  {
    nilai: 'indeks_persen',
    label: 'Indeks persen',
    keterangan: 'Rata-rata jawaban dalam persen dari nilai tertinggi, mis. 85%.',
  },
];

/** Label tampilan sebuah nilai tujuan/metode, atau `null` bila tak dikenal. */
export const labelTujuan = (nilai) => TUJUAN_SURVEI.find((t) => t.nilai === nilai)?.label ?? null;
export const labelMetode = (nilai) => METODE_NILAI.find((m) => m.nilai === nilai)?.label ?? null;

/**
 * Contoh TEKS hasil untuk pilihan yang sedang dipilih, sebagai penjelas di
 * pemilihnya (mis. "Nilai Survei 3,40 / 4"). Angkanya contoh tetap, BUKAN hasil
 * hitung: angka sungguhan datang dari backend sebagai `nilaiSurvei`. Tujuan
 * kosong dibaca `kepuasan`, sama seperti bawaan backend. `null` bila metode
 * belum dipilih.
 */
export function contohHasil(tujuan, metode) {
  if (metode === 'rata_rata') return 'Nilai Survei 3,40 / 4';
  if (metode === 'indeks_persen') return `Indeks ${labelTujuan(tujuan) ?? 'Kepuasan'} 85%`;
  return null;
}
