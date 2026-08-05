import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ADMIN_ROLES } from './create-user.dto';

export class UpdateUserDto {
  @ApiPropertyOptional({ maxLength: 50 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  nama?: string;

  @ApiPropertyOptional({ description: 'OPD tautan akun (untuk Admin OPD)' })
  @IsOptional()
  @IsInt()
  opdId?: number;

  @ApiPropertyOptional({
    enum: ADMIN_ROLES,
    description:
      'Ubah role akun (opd | kabupaten; kabupaten = superuser) -- hanya kabupaten yang boleh mengubah',
  })
  @IsOptional()
  @IsIn(ADMIN_ROLES)
  role?: Role;
}
