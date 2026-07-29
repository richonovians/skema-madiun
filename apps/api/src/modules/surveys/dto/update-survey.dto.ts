import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateSurveyDto {
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  judul?: string;

  @ApiPropertyOptional({ maxLength: 20 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  periode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowMultipleSubmit?: boolean;
}
