import { BaseEntity } from '../../../common/entities/base.entity';
import { AnswerEntity } from './answer.entity';

/**
 * Respons pengisian survei. Sengaja TIDAK memuat `userId`/`dedupeUserId`:
 * SKM bersifat agregat/anonim — identitas pengisi tidak diekspos ke admin OPD.
 */
export class ResponseEntity extends BaseEntity<ResponseEntity> {
  id: number;
  surveyId: number;
  submittedAt: Date;
  answers?: AnswerEntity[];
}
