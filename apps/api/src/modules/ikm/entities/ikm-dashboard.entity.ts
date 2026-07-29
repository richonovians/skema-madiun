import { IkmMutu } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Satu baris hasil IKM (snapshot survei tertutup) dalam perbandingan lintas-OPD. */
export class IkmDashboardItemEntity extends BaseEntity<IkmDashboardItemEntity> {
  peringkat: number;
  opdId: number;
  opdNama: string;
  jenisLayanan: string | null;
  surveyId: number;
  judul: string;
  periode: string;
  nilaiIkm: number;
  mutu: IkmMutu;
  jumlahResponden: number;
}

/**
 * Agregat & perbandingan IKM seluruh OPD (Admin Kabupaten) — dibangun dari snapshot
 * `ikm_results` (survei yang sudah `ditutup`), diurutkan dari nilai IKM tertinggi.
 */
export class IkmDashboardEntity extends BaseEntity<IkmDashboardEntity> {
  items: IkmDashboardItemEntity[];
  rataRataIkm: number | null;
  totalOpd: number;
  totalResponden: number;
}
