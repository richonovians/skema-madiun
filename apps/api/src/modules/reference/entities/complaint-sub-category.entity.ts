import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Satu sub-kategori pengaduan (INT-42) -- level lebih spesifik di bawah `ComplaintCategoryEntity`. */
export class ComplaintSubCategoryEntity extends BaseEntity<ComplaintSubCategoryEntity> {
  @ApiProperty({ example: 'infrastruktur_jalan' })
  kode: string;

  @ApiProperty({ example: 'Infrastruktur Jalan & Jembatan' })
  nama: string;

  @ApiProperty({ example: 'infrastruktur', description: 'Kode kategori umum induk' })
  kategoriKode: string;
}
