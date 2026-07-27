import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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
}
