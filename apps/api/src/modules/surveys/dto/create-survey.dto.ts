import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { PERIODE_REGEX } from '../utils/periode.util';

export class CreateSurveyDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  judul: string;

  @ApiProperty({
    maxLength: 20,
    example: '2026-Q1',
    description: 'Format kanonik triwulan: {tahun}-Q{1-4} (D5+D8)',
  })
  @IsString()
  @Matches(PERIODE_REGEX, { message: 'periode harus berformat {tahun}-Q{1-4}, mis. "2026-Q1"' })
  periode: string;

  @ApiPropertyOptional({ default: false, description: 'Boleh mengisi >1 kali per periode' })
  @IsOptional()
  @IsBoolean()
  allowMultipleSubmit?: boolean;

  @ApiPropertyOptional({
    default: false,
    description: 'Izinkan pengisian tanpa login (tautan/QR publik, rute /isi/:id)',
  })
  @IsOptional()
  @IsBoolean()
  izinkanAnonim?: boolean;

  @ApiPropertyOptional({
    description:
      'OPD tujuan — hanya dipakai oleh kabupaten (=superuser; Admin OPD memakai OPD-nya sendiri)',
  })
  @IsOptional()
  @IsInt()
  opdId?: number;
}
