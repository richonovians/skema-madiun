import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { COMPLAINT_CATEGORIES } from '../../reference/reference.constants';

const KATEGORI_KODE = COMPLAINT_CATEGORIES.map((k) => k.kode);

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
