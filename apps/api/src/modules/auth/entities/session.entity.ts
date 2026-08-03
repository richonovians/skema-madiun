import { ApiProperty } from '@nestjs/swagger';
import { BaseEntity } from '../../../common/entities/base.entity';
import { MeEntity } from './me.entity';

/** Hasil login (dev-login sekarang, callback SSO nanti) — token sesi + profil pengguna. */
export class SessionEntity extends BaseEntity<SessionEntity> {
  @ApiProperty({ description: 'Token sesi (JWT) — kirim sebagai "Authorization: Bearer <token>"' })
  token: string;

  @ApiProperty({ type: MeEntity })
  user: MeEntity;
}
