import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSurveyDto {
  @ApiProperty({ maxLength: 100 })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  judul: string;

  @ApiProperty({ maxLength: 20, example: '2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  periode: string;

  @ApiPropertyOptional({ default: false, description: 'Boleh mengisi >1 kali per periode' })
  @IsOptional()
  @IsBoolean()
  allowMultipleSubmit?: boolean;

  @ApiPropertyOptional({
    description: 'OPD tujuan — hanya dipakai oleh superuser (Admin OPD memakai OPD-nya sendiri)',
  })
  @IsOptional()
  @IsInt()
  opdId?: number;
}
