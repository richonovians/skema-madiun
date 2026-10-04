import { SurveyStatus } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';

export class SurveyEntity extends BaseEntity<SurveyEntity> {
  id: number;
  opdId: number;
  judul: string;
  periode: string;
  status: SurveyStatus;
  allowMultipleSubmit: boolean;
  /** Survei ini boleh diisi tanpa sesi lewat /survei/:id. Baku false. */
  izinkanAnonim: boolean;
  /**
   * Survei utama OPD ini: tujuan tombol "Lanjut Isi Survei" pada halaman sukses
   * pengaduan. Paling banyak satu per OPD, ditegakkan indeks unik parsial.
   */
  isUtama: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Jumlah responden yang sudah mengisi. Hanya diisi pada `GET /surveys` (INT-9). */
  respondentsCount?: number;
  /** Nilai IKM live-compute (null bila belum ada unsur/responden). Hanya diisi pada `GET /surveys` (INT-9). */
  nilaiIkm?: number | null;
  /**
   * Kapan respons TERAKHIR masuk ke survei ini, atau `null` bila belum ada satu
   * pun (4 Oktober 2026). Hanya diisi pada `GET /surveys/:id`.
   *
   * Ada di sini, bukan di meta daftar respons, karena layar ringkasan sudah
   * memanggil endpoint ini sekali untuk judul & periode -- sementara menaruhnya
   * di `PaginatedResult` menuntut bentuk meta SELURUH API ikut berubah.
   */
  terakhirMasuk?: Date | null;
  /** Nama OPD pemilik survei. Hanya diisi pada `GET /surveys/active` (INT-17). */
  opdNama?: string;
  /** Jumlah pertanyaan dalam survei. Hanya diisi pada `GET /surveys/active` (INT-17). */
  questionsCount?: number;
}
