import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ASSIGNABLE_ROLES } from './create-user.dto';

export class UpdateUserDto {
  /**
   * TETAP ADA meski antarmuka "Ubah Role Admin" mengunci nama (5 September
   * 2026): penguncian itu ada di halaman, bukan di API. Membuang field ini
   * akan membuat klien lain yang masih mengirimnya menerima 400 karena
   * ValidationPipe memakai `forbidNonWhitelisted`.
   */
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nama?: string;

  @ApiPropertyOptional({ description: 'OPD tautan akun; wajib bila `roles` memuat `opd`' })
  @IsOptional()
  @IsInt()
  opdId?: number;

  @ApiPropertyOptional({
    enum: ASSIGNABLE_ROLES,
    isArray: true,
    description:
      'Himpunan role akun. Minimal satu. Hanya superuser yang boleh mengubahnya, dan ' +
      'tidak untuk akunnya sendiri (cegah self-lockout).',
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsIn(ASSIGNABLE_ROLES, { each: true })
  roles?: Role[];
}
