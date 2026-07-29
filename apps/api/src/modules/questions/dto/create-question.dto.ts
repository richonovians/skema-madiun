import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const ALLOWED_TYPES = [QuestionType.skala, QuestionType.teks, QuestionType.pilihan] as const;

export class QuestionOptionInputDto {
  @ApiProperty({ maxLength: 255 })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  label: string;

  @ApiPropertyOptional({ description: 'Skor opsi (opsional — di luar cakupan rumus IKM)' })
  @IsOptional()
  @IsInt()
  nilai?: number;
}

export class CreateQuestionDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  teks: string;

  @ApiProperty({ enum: ALLOWED_TYPES })
  @IsIn(ALLOWED_TYPES as unknown as string[])
  tipe: QuestionType;

  @ApiPropertyOptional({
    default: false,
    description: 'Dihitung ke IKM (hanya tipe skala — lihat Lampiran A PermenPANRB 14/2017)',
  })
  @IsOptional()
  @IsBoolean()
  isIkmUnsur?: boolean;

  @ApiPropertyOptional({ maxLength: 5, description: 'Kode unsur U1..U9 (null jika kustom)' })
  @IsOptional()
  @IsString()
  @MaxLength(5)
  kodeUnsur?: string;

  @ApiPropertyOptional({
    type: [QuestionOptionInputDto],
    description: 'Wajib diisi (minimal 2) untuk tipe pilihan; diabaikan untuk tipe lain',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionInputDto)
  options?: QuestionOptionInputDto[];
}
