import { ApiProperty } from '@nestjs/swagger';
import { SurveyStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateSurveyStatusDto {
  @ApiProperty({
    enum: SurveyStatus,
    description: 'Transisi: draft→aktif, draft→ditutup, aktif→ditutup',
  })
  @IsEnum(SurveyStatus)
  status: SurveyStatus;
}
