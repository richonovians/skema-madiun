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
  dihitungPada: Date;
}
