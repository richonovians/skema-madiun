import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Representasi OPD (cache lokal dari Helpdesk). `externalId` & `syncedAt` di-*expose*
 * sebagai metadata sinkronisasi (mis. untuk UI "terakhir disinkron").
 */
export class OpdEntity extends BaseEntity<OpdEntity> {
  id: number;
  externalId: string | null;
  nama: string;
  kode: string;
  jenisLayanan: string | null;
  penanggungJawab: string | null;
  isActive: boolean;
  syncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Jumlah survei berstatus `aktif` milik OPD ini. Hanya diisi pada `GET /opd` (INT-10). */
  activeSurveys?: number;
  /** Jumlah pengaduan belum tuntas (`diterima`/`diproses`) milik OPD ini. Hanya diisi pada `GET /opd` (INT-10). */
  openComplaints?: number;
  /**
   * Jumlah akun AKTIF berperan `opd` yang tertaut ke OPD ini (4 Oktober 2026).
   * Hanya diisi pada `GET /opd`. Nol berarti tak seorang pun mengelola OPD ini,
   * dan itulah keadaan yang perlu terlihat Admin Kabupaten: daftar OPD datang
   * dari Helpdesk secara baca-saja, jadi OPD baru selalu masuk tanpa admin.
   */
  adminCount?: number;
}
