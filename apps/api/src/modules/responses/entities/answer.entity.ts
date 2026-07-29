import { BaseEntity } from '../../../common/entities/base.entity';

/** Satu jawaban atas satu pertanyaan dalam sebuah respons survei. */
export class AnswerEntity extends BaseEntity<AnswerEntity> {
  id: number;
  questionId: number;
  nilai: number | null; // untuk tipe skala (1-4)
  teks: string | null; // untuk tipe teks/saran
  selectedOptionId: number | null; // untuk tipe pilihan (Fase 3)
}
