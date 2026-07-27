import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Satu kategori baku pengaduan masyarakat. */
export class ComplaintCategoryEntity extends BaseEntity<ComplaintCategoryEntity> {
  @ApiProperty({ example: 'infrastruktur' })
  kode: string;

  @ApiProperty({ example: 'Infrastruktur' })
  nama: string;
}
