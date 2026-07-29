import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(1)
  teks?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isIkmUnsur?: boolean;

  @ApiPropertyOptional({ maxLength: 5 })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  kodeUnsur?: string;
}
