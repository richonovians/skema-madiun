import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

/** Satu jawaban dalam payload pengisian. Isi `nilai` untuk skala, `teks` untuk teks/saran. */
export class AnswerInputDto {
  @ApiProperty({ description: 'Id pertanyaan yang dijawab' })
  @IsInt()
  @Min(1)
  questionId: number;

  @ApiPropertyOptional({ minimum: 1, maximum: 4, description: 'Nilai skala 1-4 (tipe skala)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(4)
  nilai?: number;

  @ApiPropertyOptional({ maxLength: 1000, description: 'Jawaban teks/saran (tipe teks)' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  teks?: string;
}

export class SubmitResponseDto {
  @ApiProperty({ type: [AnswerInputDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AnswerInputDto)
  answers: AnswerInputDto[];
}
