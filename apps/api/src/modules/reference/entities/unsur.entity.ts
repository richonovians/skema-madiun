import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Satu unsur baku SKM (PermenPANRB 14/2017). */
export class UnsurEntity extends BaseEntity<UnsurEntity> {
  @ApiProperty({ example: 'U1', description: 'Kode unsur (U1..U9)' })
  kode: string;

  @ApiProperty({ example: 'Persyaratan' })
  teks: string;
}
