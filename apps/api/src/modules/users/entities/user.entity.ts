import { ApiHideProperty } from '@nestjs/swagger';
import { JenisPengguna, Role } from '@prisma/client';
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

  /**
   * Bolehkah akun ini DIBERI peran Admin OPD (6 Oktober 2026).
   *
   * DITURUNKAN DI BACKEND, bukan dihitung ulang antarmuka. Aturannya bergantung
   * pada `app.nodeEnv` -- gerbang ASN hanya hidup di produksi -- dan frontend
   * tak tahu apa pun tentang itu. Dua salinan aturan akan menghasilkan kotak
   * centang yang dapat ditekan tetapi pasti ditolak 400, dan penggunanya
   * menyalahkan aplikasinya, bukan aturannya. Lihat `boleh-admin-opd.ts`.
   *
   * Opsional karena hanya diisi jalur yang melewati `UsersService`; entity ini
   * juga dibentuk dari baris mentah di tempat lain.
   */
  bolehJadiAdminOpd?: boolean;

  /**
   * TIDAK PERNAH KELUAR, dan hanya dideklarasikan agar dapat ditahan -- pola
   * yang sama dengan `consentAt` di bawah, dan dengan alasan yang sama kerasnya:
   * `BaseEntity` meng-`Object.assign` SELURUH baris dan serialisasi di repo ini
   * expose-all, jadi kolom yang tak disebut di sini ikut keluar sendiri.
   *
   * Yang dibutuhkan antarmuka adalah `bolehJadiAdminOpd` di atas -- boleh atau
   * tidak -- bukan status kepegawaian orangnya.
   */
  @Exclude()
  @ApiHideProperty()
  jenisPengguna: JenisPengguna | null;

  // Field internal — dihidden dari response (BaseEntity meng-Object.assign seluruh baris).
  @Exclude()
  @ApiHideProperty()
  consentAt: Date | null;

  @Exclude()
  @ApiHideProperty()
  deletedAt: Date | null;
}
