import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// Tipe `pilihan` disiapkan di skema tetapi fiturnya baru diimplementasikan Fase 3.
const ALLOWED_TYPES = [QuestionType.skala, QuestionType.teks] as const;

export class CreateQuestionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  teks: string;

  @ApiProperty({ enum: ALLOWED_TYPES, description: 'skala atau teks (pilihan → Fase 3)' })
  @IsIn(ALLOWED_TYPES as unknown as string[])
  tipe: QuestionType;

  @ApiPropertyOptional({ default: false, description: 'Dihitung ke IKM (pertanyaan unsur)' })
  @IsOptional()
  @IsBoolean()
  isIkmUnsur?: boolean;

  @ApiPropertyOptional({ maxLength: 5, description: 'Kode unsur U1..U9 (null jika kustom)' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  kodeUnsur?: string;
}
