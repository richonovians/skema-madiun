import { ApiProperty } from '@nestjs/swagger';
import { TingkatPengaduan } from '@prisma/client';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Satu kategori baku pengaduan masyarakat. */
export class ComplaintCategoryEntity extends BaseEntity<ComplaintCategoryEntity> {
  @ApiProperty({ example: 'kab_kesehatan' })
  kode: string;

  @ApiProperty({ example: 'Kesehatan' })
  nama: string;

  /**
   * Tingkat yang memiliki kategori ini (4 November 2026). IKUT DIKIRIM, bukan
   * disimpulkan klien dari awalan kodenya: awalan `kec_`/`kab_` itu konvensi
   * penamaan untuk pembaca data mentah, bukan kontrak API.
   */
  @ApiProperty({ enum: TingkatPengaduan })
  tingkat: TingkatPengaduan;
}
