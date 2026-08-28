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

  /**
   * Apakah pengguna ini masih harus memberikan persetujuan PDP (celah 2,
   * 2026-08-27). Diisi AuthService.getMe lewat ConsentService.isRequired.
   *
   * BOOLEAN, bukan `consentAt`-nya: yang dibutuhkan antarmuka cuma "sudah atau
   * belum", sementara tanggal persetujuan adalah data pribadi yang tak ada
   * gunanya dikirim ke klien. Itu sebabnya `consentAt` di bawah tetap @Exclude().
   */
  consentRequired: boolean;

  /**
   * Apakah akun ini benar-benar sudah tertaut ke SSO Helpdesk (celah 5,
   * 2026-08-27), yaitu `ssoSubject`-nya sub asli — bukan nilai PENAMPUNG dari
   * masa sebelum SSO (`seed-*`, `pending:...`).
   *
   * Ditentukan di sini, bukan ditebak frontend dari pola string: bentuk
   * penampung itu detail internal basis data, dan menyalinnya ke adapter
   * frontend berarti dua tempat harus mengingat aturan yang sama.
   */
  ssoLinked: boolean;

  @Exclude()
  @ApiHideProperty()
  consentAt: Date | null;

  @Exclude()
  @ApiHideProperty()
  deletedAt: Date | null;
}
