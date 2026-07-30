import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const EXPORT_FORMATS = ['csv', 'excel', 'pdf'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];

export class ExportResultsQueryDto {
  @ApiProperty({ enum: EXPORT_FORMATS })
  @IsIn(EXPORT_FORMATS)
  format: ExportFormat;
}
