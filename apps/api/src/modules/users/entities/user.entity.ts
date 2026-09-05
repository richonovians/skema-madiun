import { ApiHideProperty } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Representasi akun pengguna untuk response admin. Field internal disembunyikan. */
export class UserEntity extends BaseEntity<UserEntity> {
  id: number;
  ssoSubject: string;
  nama: string;
  email: string;
  /** Seluruh role yang dimiliki akun (5 September 2026). */
  roles: Role[];
  opdId: number | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  /** Nama OPD terkait (bila `opdId` terisi). Hanya diisi pada `GET /users` (INT-11). */
  opdNama?: string | null;

  // Field internal — dihidden dari response (BaseEntity meng-Object.assign seluruh baris).
  @Exclude()
  @ApiHideProperty()
  consentAt: Date | null;

  @Exclude()
  @ApiHideProperty()
  deletedAt: Date | null;
}
