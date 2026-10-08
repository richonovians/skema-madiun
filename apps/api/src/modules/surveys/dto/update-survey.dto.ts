import { ApiPropertyOptional } from '@nestjs/swagger';
import { MetodeNilai, TujuanSurvei } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
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

  @ApiPropertyOptional({
    enum: TujuanSurvei,
    description:
      'Hanya untuk survei `custom` (ditolak 400 pada SKM; boleh diubah sampai survei ditutup). Menentukan kamus kata kategori hasil dan nama angka pada metode `indeks_persen`.',
  })
  @IsOptional()
  @IsEnum(TujuanSurvei)
  tujuan?: TujuanSurvei;

  @ApiPropertyOptional({
    enum: MetodeNilai,
    description:
      'Hanya untuk survei `custom` (ditolak 400 pada SKM; boleh diubah sampai survei ditutup). `rata_rata` menampilkan "3,40 / 4"; `indeks_persen` menampilkan "85%". Hanya mengatur tampilan, jawabannya sama.',
  })
  @IsOptional()
  @IsEnum(MetodeNilai)
  metodeNilai?: MetodeNilai;
}
