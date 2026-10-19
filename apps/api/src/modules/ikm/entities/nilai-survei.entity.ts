import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Nilai Survei satu survei custom (8 Oktober 2026), sudah jadi dan siap
 * ditampilkan: frontend tidak menghitung ulang apa pun. Padanan survei SKM
 * adalah `nilaiIkm` + `mutu`.
 */
export class NilaiSurveiEntity extends BaseEntity<NilaiSurveiEntity> {
  /** Nama angka: "Nilai Survei" (metode rata_rata) atau "Indeks Kepuasan" / "Indeks Evaluasi" / "Indeks Penilaian". */
  judul: string;
  /** Angka mentah: rata-rata skala 1-4 (mis. 3.4) atau persen penuh, paling banyak dua desimal (mis. 85 atau 87.5). */
  nilai: number;
  /** Teks siap pakai: "3,40 / 4" atau "85%". */
  tampilan: string;
  /** Kategori verbal menurut tujuan, mis. "Sangat Puas" atau "Baik". */
  kategori: string;
}
