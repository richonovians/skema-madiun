import { QuestionType } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';
import { QuestionOptionEntity } from './question-option.entity';

/** Pertanyaan dalam sebuah paket survei. */
export class QuestionEntity extends BaseEntity<QuestionEntity> {
  id: number;
  surveyId: number;
  teks: string;
  tipe: QuestionType;
  isIkmUnsur: boolean;
  kodeUnsur: string | null;
  /**
   * Nama resmi unsur menurut `kodeUnsur` (mis. "Persyaratan"), atau `null` bila
   * pertanyaan ini bukan unsur baku. Terpisah dari `teks`: sejak 8 Oktober 2026
   * `teks` pada unsur adalah KALIMAT pertanyaan buatan OPD, sedangkan nama
   * unsurnya standar yang tidak berubah.
   */
  namaUnsur: string | null;
  urutan: number;
  createdAt: Date;
  updatedAt: Date;
  /**
   * Terurut sesuai `urutan`. Tipe `pilihan` selalu terisi (≥2). Tipe `skala`
   * terisi HANYA bila labelnya pernah disesuaikan (tepat 4, `nilai` = skor
   * 1-4); kosong berarti label baku SKM yang dipakai. Tipe `teks` selalu kosong.
   */
  options?: QuestionOptionEntity[];
}
