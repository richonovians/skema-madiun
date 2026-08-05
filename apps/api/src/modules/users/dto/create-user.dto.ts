import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Role admin yang dapat dibuat lewat endpoint ini (responden dibuat via SSO). */
export const ADMIN_ROLES: Role[] = [Role.opd, Role.kabupaten];

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

  @ApiProperty({ enum: ADMIN_ROLES, description: 'opd | kabupaten (kabupaten = superuser)' })
  @IsIn(ADMIN_ROLES)
  role: Role;

  @ApiPropertyOptional({ description: 'Wajib bila role = opd (OPD tautan akun)' })
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
