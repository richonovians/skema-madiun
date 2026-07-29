import { BaseEntity } from '../../../common/entities/base.entity';

/** Satu opsi jawaban untuk pertanyaan tipe `pilihan`. */
export class QuestionOptionEntity extends BaseEntity<QuestionOptionEntity> {
  id: number;
  label: string;
  nilai: number | null;
  urutan: number;
}
