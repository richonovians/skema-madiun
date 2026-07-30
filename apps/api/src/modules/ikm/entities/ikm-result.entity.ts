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
  dihitungPada: Date;
}
