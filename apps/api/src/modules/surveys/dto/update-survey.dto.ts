import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { PERIODE_REGEX } from '../utils/periode.util';

export class UpdateSurveyDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  judul?: string;

  @ApiPropertyOptional({ maxLength: 20, example: '2026-Q1' })
  @IsOptional()
  @IsString()
  @Matches(PERIODE_REGEX, { message: 'periode harus berformat {tahun}-Q{1-4}, mis. "2026-Q1"' })
  periode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowMultipleSubmit?: boolean;
}
