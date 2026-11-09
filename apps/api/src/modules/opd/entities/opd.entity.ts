import { ApiProperty } from '@nestjs/swagger';
import { TingkatPengaduan } from '@prisma/client';
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
  /**
   * Tingkat pemerintahan OPD ini (4 November 2026). DIHITUNG di backend oleh
   * `tingkatOpd()`, tidak disimpan — tabel `opd` baca-saja dari Helpdesk.
   *
   * Dikirim ke klien supaya formulir pengaduan dapat menyaring daftar tujuan
   * per tingkat TANPA menghitung ulang aturannya sendiri. Frontend yang
   * mencocokkan awalan nama akan menyimpang diam-diam begitu aturan di sini
   * berubah — persis cacat yang dijaga catatan `bolehJadiAdminOpd` di
   * `UserEntity`.
   */
  @ApiProperty({ enum: TingkatPengaduan })
  tingkat: TingkatPengaduan;
  penanggungJawab: string | null;
  isActive: boolean;
  syncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Jumlah survei berstatus `aktif` milik OPD ini. Hanya diisi pada `GET /opd`
   * (INT-10), dan hanya untuk peran berakses penuh sejak 9 November 2026 --
   * peran lain tidak menerima medan ini sama sekali. Berlaku juga untuk
   * `openComplaints` dan `adminCount` di bawah.
   */
  activeSurveys?: number;
  /** Jumlah pengaduan belum tuntas (`STATUS_BELUM_TUNTAS`) milik OPD ini. Hanya diisi pada `GET /opd` (INT-10). */
  openComplaints?: number;
  /**
   * Jumlah akun AKTIF berperan `opd` yang tertaut ke OPD ini (4 Oktober 2026).
   * Hanya diisi pada `GET /opd`. Nol berarti tak seorang pun mengelola OPD ini,
   * dan itulah keadaan yang perlu terlihat Admin Kabupaten: daftar OPD datang
   * dari Helpdesk secara baca-saja, jadi OPD baru selalu masuk tanpa admin.
   */
  adminCount?: number;
}
