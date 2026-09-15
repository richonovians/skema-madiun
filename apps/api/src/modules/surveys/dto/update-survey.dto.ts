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

  @ApiPropertyOptional({
    default: false,
    description: 'Izinkan pengisian tanpa login (tautan/QR publik, rute /survei/:id)',
  })
  @IsOptional()
  @IsBoolean()
  izinkanAnonim?: boolean;

  @ApiPropertyOptional({
    default: false,
    description:
      'Jadikan survei utama OPD ini. Tujuan tombol "Lanjut Isi Survei" pada halaman ' +
      'sukses pengaduan. Menyalakannya MELEPAS survei utama OPD yang sebelumnya ' +
      '(paling banyak satu per OPD).',
  })
  @IsOptional()
  @IsBoolean()
  isUtama?: boolean;
}
