import { SurveyStatus } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';

/**
 * Baris halaman Sampah. BENTUKNYA SENDIRI, bukan SurveyEntity, karena yang
 * dibutuhkan di sana berbeda: siapa yang membuang, kapan, dan berapa jawaban
 * yang ikut terbawa. Tanpa `jumlahJawaban` di sini, halaman Sampah harus
 * memanggil satu endpoint per baris hanya untuk mengisi satu kolom.
 */
export class TrashedSurveyEntity extends BaseEntity<TrashedSurveyEntity> {
  id: number;
  judul: string;
  periode: string;
  /** Status saat ia dibuang. Survei aktif selalu tercatat `ditutup` di sini. */
  status: SurveyStatus;
  opdId: number;
  opdNama: string;
  deletedAt: Date;
  /** `null` bila akun yang membuangnya sudah dihapus (FK ON DELETE SET NULL). */
  deletedByNama: string | null;
  jumlahJawaban: number;
}
