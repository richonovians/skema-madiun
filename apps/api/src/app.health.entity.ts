import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from './common/entities/base.entity';

/** Contoh nyata pola entity: response health check. */
export class HealthEntity extends BaseEntity<HealthEntity> {
  @ApiProperty({ example: 'ok' })
  status: string;

  @ApiProperty({ example: 'skm-api' })
  service: string;

  @ApiProperty({ example: '2026-07-20T00:00:00.000Z' })
  timestamp: string;
}
