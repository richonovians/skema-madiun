import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Role yang dapat DIBERIKAN lewat Manajemen User.
 *
 * `superuser` disertakan 2026-08-20 supaya akun superuser bisa dibuat/diubah
 * lewat manajemen pengguna, bukan cuma lewat seed.
 *
 * `responden` disertakan 5 September 2026 atas permintaan pengguna ("semua
 * user role bisa memakai dan memilih lebih dari 1 role"). Namanya berubah dari
 * `ADMIN_ROLES` karena `responden` bukan role admin -- daftar ini sekarang
 * berisi SELURUH role yang ada.
 *
 * `superuser` ADA di sini tapi TETAP tak dapat dipetakan dari klaim SSO (lihat
 * MAPPABLE_ROLES di sso-role.mapper.ts). Bedanya menentukan: di sini yang
 * memberi adalah manusia yang sudah superuser, di sana sistem di luar kendali
 * kita.
 */
export const ASSIGNABLE_ROLES: Role[] = [Role.superuser, Role.kabupaten, Role.opd, Role.responden];

export class CreateUserDto {
  @ApiProperty({ maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nama: string;

  @ApiProperty({ maxLength: 100 })
  @IsEmail()
  @MaxLength(100)
  email: string;

  @ApiProperty({
    enum: ASSIGNABLE_ROLES,
    isArray: true,
    description: 'Minimal satu role. Satu akun boleh memegang beberapa sekaligus.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(ASSIGNABLE_ROLES, { each: true })
  roles: Role[];

  @ApiPropertyOptional({ description: 'Wajib bila `roles` memuat `opd` (OPD tautan akun)' })
  @IsOptional()
  @IsInt()
  opdId?: number;

  @ApiPropertyOptional({
    description:
      'Identitas SSO; bila kosong diisi placeholder "pending:<email>" (interim sebelum SSO)',
    maxLength: 255,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  ssoSubject?: string;
}
