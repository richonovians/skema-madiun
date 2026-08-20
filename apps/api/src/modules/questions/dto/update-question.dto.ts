import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { QuestionOptionInputDto } from './create-question.dto';

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

  /**
   * Ganti SELURUH opsi jawaban pertanyaan ini (2026-08-20, permintaan user
   * "fitur edit opsi jawaban juga dapat digunakan pada pertanyaan skala 1-4").
   *
   * Sebelum ini tak ada jalan apa pun untuk mengubah opsi setelah pertanyaan
   * dibuat -- tak ada endpoint question_options, dan DTO ini hanya menerima
   * teks/isIkmUnsur/kodeUnsur. Frontend memutarinya dengan buat-baru +
   * hapus-lama, yang mengganti id pertanyaan dan bisa meninggalkan duplikat
   * bila gagal separuh jalan. Kini penggantiannya atomik di satu transaksi.
   *
   * Semantiknya PENGGANTIAN PENUH (bukan tambal sebagian): opsi lama dihapus,
   * daftar baru dibuat urut sesuai posisi array. Diabaikan bila tak dikirim.
   */
  @ApiPropertyOptional({
    type: [QuestionOptionInputDto],
    description:
      'Ganti seluruh opsi: tipe `pilihan` minimal 2 opsi, tipe `skala` tepat 4 (label skor 1-4). Tidak berlaku untuk tipe `teks`.',
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionInputDto)
  options?: QuestionOptionInputDto[];
}
