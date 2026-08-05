import { ApiPropertyOptional, ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import {
  COMPLAINT_CATEGORIES,
  COMPLAINT_SUB_CATEGORIES,
} from '../../reference/reference.constants';

const KATEGORI_KODE = COMPLAINT_CATEGORIES.map((k) => k.kode);
const SUB_KATEGORI_KODE = COMPLAINT_SUB_CATEGORIES.map((s) => s.kode);

export class CreateComplaintDto {
  @ApiProperty({ description: 'Id OPD tujuan pengaduan' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  opdId: number;

  @ApiProperty({
    enum: KATEGORI_KODE,
    description: 'Kode kategori (lihat GET /ref/complaint-categories)',
  })
  @IsIn(KATEGORI_KODE)
  kategori: string;

  @ApiPropertyOptional({
    enum: SUB_KATEGORI_KODE,
    description:
      'Kode sub-kategori opsional (lihat GET /ref/complaint-sub-categories), harus sejalan dengan `kategori`',
  })
  @IsOptional()
  @IsIn(SUB_KATEGORI_KODE)
  subKategori?: string;

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
}
