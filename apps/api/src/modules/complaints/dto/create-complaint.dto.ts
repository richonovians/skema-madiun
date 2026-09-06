import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { COMPLAINT_CATEGORIES } from '../../reference/reference.constants';

const KATEGORI_KODE = COMPLAINT_CATEGORIES.map((k) => k.kode);

export class CreateComplaintDto {
  /**
   * OPSIONAL sejak 6 September 2026 (permintaan pengguna): pengirim yang tak
   * tahu pengaduannya harus ditujukan kepada siapa memilih "Belum tahu
   * tujuannya", lalu Superuser/Admin Kabupaten meneruskannya lewat
   * `PATCH /complaints/:id/opd`.
   */
  @ApiPropertyOptional({
    description: 'Id OPD tujuan. Dikosongkan bila pengirim belum tahu tujuannya.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  opdId?: number;

  @ApiProperty({
    enum: KATEGORI_KODE,
    description: 'Kode kategori (lihat GET /ref/complaint-categories)',
  })
  @IsIn(KATEGORI_KODE)
  kategori: string;

  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  judul: string;

  @ApiProperty({ maxLength: 5000, description: 'Uraian pengaduan' })
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  uraian: string;

  @ApiPropertyOptional({
    default: false,
    description: 'Kirim tanpa menampilkan identitas pelapor kepada admin',
  })
  @IsOptional()
  // Nilai datang dari multipart (string), jadi konversinya EKSPLISIT -- pola
  // sama list-opd-query.dto.ts. `@Type(() => Boolean)` TIDAK dipakai karena
  // Boolean('false') === true, yang akan membuat setiap pengaduan biasa
  // terkirim sebagai anonim.
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  isAnonim?: boolean;
}
