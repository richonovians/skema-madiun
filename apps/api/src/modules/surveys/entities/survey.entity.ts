import { SurveyStatus } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';

export class SurveyEntity extends BaseEntity<SurveyEntity> {
  id: number;
  opdId: number;
  judul: string;
  periode: string;
  status: SurveyStatus;
  allowMultipleSubmit: boolean;
  /** Survei ini boleh diisi tanpa sesi lewat /isi/:id. Baku false. */
  izinkanAnonim: boolean;
  createdAt: Date;
  updatedAt: Date;
  /** Jumlah responden yang sudah mengisi. Hanya diisi pada `GET /surveys` (INT-9). */
  respondentsCount?: number;
  /** Nilai IKM live-compute (null bila belum ada unsur/responden). Hanya diisi pada `GET /surveys` (INT-9). */
  nilaiIkm?: number | null;
  /** Nama OPD pemilik survei. Hanya diisi pada `GET /surveys/active` (INT-17). */
  opdNama?: string;
  /** Jumlah pertanyaan dalam survei. Hanya diisi pada `GET /surveys/active` (INT-17). */
  questionsCount?: number;
}
