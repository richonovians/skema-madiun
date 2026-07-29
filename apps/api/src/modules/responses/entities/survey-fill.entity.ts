import { SurveyStatus } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';
import { QuestionEntity } from '../../questions/entities/question.entity';

/**
 * Tampilan survei untuk diisi responden (BE-22): metadata + daftar pertanyaan terurut.
 * `sudahMengisi` membantu frontend menandai survei single-submit yang telah diisi.
 */
export class SurveyFillEntity extends BaseEntity<SurveyFillEntity> {
  id: number;
  judul: string;
  periode: string;
  status: SurveyStatus;
  allowMultipleSubmit: boolean;
  sudahMengisi: boolean;
  questions: QuestionEntity[];
}
