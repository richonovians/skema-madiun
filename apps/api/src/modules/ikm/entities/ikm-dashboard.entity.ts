import { IkmMutu, SurveyStatus } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Satu baris hasil IKM dalam perbandingan lintas-OPD. `status` (2026-08-05)
 * membedakan angka FINAL (`ditutup`, dari snapshot `ikm_results`) dari yang
 * MASIH BISA BERUBAH (`aktif`, live-compute dari respons yang sudah masuk) --
 * lihat catatan `IkmService.getDashboard`.
 */
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
  status: SurveyStatus;
}

/**
 * Agregat & perbandingan IKM seluruh OPD (Admin Kabupaten) — gabungan snapshot
 * `ikm_results` (survei `ditutup`, final) DAN live-compute survei `aktif` yang
 * sudah punya responden (2026-08-05 -- SEBELUMNYA buta total thd survei yang
 * masih berjalan, lihat `IkmService.getDashboard`), diurutkan nilai IKM tertinggi.
 */
export class IkmDashboardEntity extends BaseEntity<IkmDashboardEntity> {
  items: IkmDashboardItemEntity[];
  rataRataIkm: number | null;
  totalOpd: number;
  totalResponden: number;

  // INT-13 (D3, 2026-08-05) -- lengkapi gap dashboard Kabupaten. `openComplaints`/
  // `newComplaints` TIDAK ikut filter `?periode=` (complaint bukan entitas ber-periode
  // spt survei/ikm_results) -- hanya `?jenisLayanan=` yang berlaku, konsisten dgn
  // filter OPD yang sudah ada.
  /** Pengaduan belum selesai (status diterima/diproses), org-wide. */
  openComplaints: number;
  /** Pengaduan masuk 7 hari terakhir, org-wide. */
  newComplaints: number;
  /**
   * "% OPD aktif yang punya minimal 1 survei berstatus aktif saat ini" (definisi
   * developer, D3 -- proxy keterlibatan OPD dgn sistem, BUKAN metrik resmi
   * Diskominfo). Null bila tak ada OPD aktif sama sekali (hindari div-by-zero).
   */
  systemActivityPercent: number | null;
}
