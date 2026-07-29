import { QuestionType } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Pertanyaan dalam sebuah paket survei. */
export class QuestionEntity extends BaseEntity<QuestionEntity> {
  id: number;
  surveyId: number;
  teks: string;
  tipe: QuestionType;
  isIkmUnsur: boolean;
  kodeUnsur: string | null;
  urutan: number;
  createdAt: Date;
  updatedAt: Date;
}
