import { ApiHideProperty } from '@nestjs/swagger';
import { JenisKelamin, Role } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../../common/entities/base.entity';

export class RespondentProfileView {
  jenisKelamin: JenisKelamin;
  kelompokUmur: string;
  pendidikan: string;
  pekerjaan: string;
}

/** Profil pengguna aktif (GET /auth/me). Field internal disembunyikan. */
export class MeEntity extends BaseEntity<MeEntity> {
  id: number;
  ssoSubject: string;
  nama: string;
  email: string;
  role: Role;
  opdId: number | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  respondentProfile: RespondentProfileView | null;

  @Exclude()
  @ApiHideProperty()
  consentAt: Date | null;

  @Exclude()
  @ApiHideProperty()
  deletedAt: Date | null;
}
