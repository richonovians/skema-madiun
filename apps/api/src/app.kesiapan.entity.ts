import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from './common/entities/base.entity';

/** Jawaban `GET /health/siap` saat seluruh komponen menjawab (BUG-072). */
export class KesiapanEntity extends BaseEntity<KesiapanEntity> {
  @ApiProperty({ example: 'siap' })
  status: 'siap';

  @ApiProperty({ enum: ['ok', 'gagal'], example: 'ok', description: 'Basis data' })
  db: 'ok' | 'gagal';

  @ApiProperty({
    enum: ['ok', 'gagal'],
    example: 'ok',
    description: 'Penyimpan sesi (Redis, atau memori bila REDIS_URL kosong)',
  })
  redis: 'ok' | 'gagal';
}
