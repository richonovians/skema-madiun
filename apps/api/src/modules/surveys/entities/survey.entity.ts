import { SurveyStatus } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';

export class SurveyEntity extends BaseEntity<SurveyEntity> {
  id: number;
  opdId: number;
  judul: string;
  periode: string;
  status: SurveyStatus;
  allowMultipleSubmit: boolean;
  createdAt: Date;
  updatedAt: Date;
}
