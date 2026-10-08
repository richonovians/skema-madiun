import { IkmMutu } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';

/** NRR (Nilai Rata-rata per unsur) satu unsur IKM. */
export class IkmUnsurEntity extends BaseEntity<IkmUnsurEntity> {
  kodeUnsur: string;
  teks: string;
  nrr: number;
  bobot: number;
  nrrTertimbang: number;
}

/** Berapa responden memilih satu nilai skala (1-4). */
export class SebaranNilaiEntity extends BaseEntity<SebaranNilaiEntity> {
  nilai: number;
  jumlah: number;
}

/**
 * Sebaran jawaban SATU pertanyaan skala (8 Oktober 2026): berapa responden
 * memilih tiap nilai 1-4. `sebaran` selalu memuat keempat nilai berurutan,
 * `jumlah` 0 untuk yang tak dipilih siapa pun.
 */
export class SebaranSkorEntity extends BaseEntity<SebaranSkorEntity> {
  pertanyaanId: number;
  /** Kode unsur baku (U1-U9); `null` untuk pertanyaan skala tambahan milik OPD. */
  kodeUnsur: string | null;
  teks: string;
  /** Jumlah jawaban skala pada pertanyaan ini (= jumlah keempat `jumlah`). */
  total: number;
  sebaran: SebaranNilaiEntity[];
}

/**
 * Hasil perhitungan IKM sebuah survei (PermenPANRB 14/2017).
 * `nilaiIkm`/`mutu` bernilai `null` bila belum ada responden (belum dapat dinilai).
 */
export class IkmResultEntity extends BaseEntity<IkmResultEntity> {
  surveyId: number;
  periode: string;
  jumlahResponden: number;
  nrrPerUnsur: IkmUnsurEntity[];
  nilaiIkm: number | null;
  mutu: IkmMutu | null;
  /**
   * Rata-rata SEMUA jawaban skala (1-4) pada survei ini, atau `null` bila belum
   * ada jawaban skala (7 Oktober 2026). Beda dari `nilaiIkm`: tetap ada untuk
   * survei tanpa 9 unsur baku, yang IKM-nya `null`. Hanya diisi
   * `IkmService.getResults` (`GET /surveys/:id/results`); `computeResult` tak
   * mengisinya karena dashboard dan statistik publik ikut memanggilnya dan
   * tak membutuhkan angka ini.
   */
  nilaiRataRata?: number | null;
  /**
   * Sebaran jawaban 1-4 PER PERTANYAAN SKALA, unsur baku maupun tambahan
   * (8 Oktober 2026). Hanya diisi `IkmService.getResults`, dengan alasan yang
   * sama seperti `nilaiRataRata`. Larik kosong bila survei tak punya pertanyaan
   * skala.
   */
  sebaranSkor?: SebaranSkorEntity[];
  dihitungPada: Date;
}
