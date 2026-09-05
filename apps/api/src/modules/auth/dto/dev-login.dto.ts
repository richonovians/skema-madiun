import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MinLength } from 'class-validator';

export class DevLoginDto {
  @ApiProperty({ description: 'Email atau ssoSubject pengguna seed yang sudah ada' })
  @IsString()
  @MinLength(1)
  identifier: string;

  /**
   * Peran yang langsung dipakai (5 September 2026). Ada supaya pengujian akun
   * ber-role banyak tak perlu dua langkah (login lalu `POST /auth/acting-role`).
   *
   * BUKAN jalan memperoleh hak: `AuthService.devLogin` menolak 403 bila akunnya
   * tak memiliki peran itu. Endpoint ini menerbitkan sesi untuk email mana pun
   * tanpa kata sandi, jadi longgar di sini berarti longgar sekali.
   */
  @ApiPropertyOptional({ enum: Role, description: 'Peran yang langsung dipakai' })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
