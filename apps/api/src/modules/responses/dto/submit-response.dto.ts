import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { NOMOR_HP_REGEX } from '../responses.constants';

/**
 * Satu jawaban dalam payload pengisian. Isi `nilai` untuk skala, `teks` untuk teks/saran,
 * `selectedOptionId` untuk pilihan.
 */
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

  @ApiPropertyOptional({ description: 'Id opsi terpilih (tipe pilihan)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  selectedOptionId?: number;
}

export class SubmitResponseDto {
  @ApiProperty({ type: [AnswerInputDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => AnswerInputDto)
  answers: AnswerInputDto[];

  /**
   * Pengisi memilih tidak merekam data dirinya (8 September 2026).
   *
   * Diletakkan di DTO INDUK, bukan hanya di DTO publik, karena kedua jalur
   * mengenal pilihan yang sama. Yang berbeda adalah cara pilihan itu terbaca:
   *
   *   - bersesi    : medan INILAH satu-satunya isyaratnya, sebab data dirinya
   *                  tak ikut di payload melainkan disalin dari akun.
   *   - tanpa sesi : berlebihan, sebab ketiadaan `nama`, `nomorHp`,
   *                  `jenisKelamin`, dan `kelompokUmur` sudah menyatakannya.
   *                  Tetap diterima supaya kedua gerbang boleh mengirim bentuk
   *                  payload yang sama.
   *
   * Tidak diisi berarti false: pengiriman lama yang tak mengenal medan ini
   * tetap merekam data diri seperti sebelumnya.
   */
  @ApiPropertyOptional({
    description: 'true bila pengisi memilih tidak merekam data dirinya pada respons ini',
  })
  @IsOptional()
  @IsBoolean()
  tanpaDataDiri?: boolean;

  /**
   * Nomor HP pengisi (1 Oktober 2026, keputusan tersurat pengguna).
   *
   * SATU-SATUNYA data diri jalur bersesi yang datang dari payload, dan itu
   * bukan kelonggaran melainkan keharusan: nama dan demografis punya sumber di
   * akun, nomor HP TIDAK. Terukur pada metadata penyedia 1 Oktober 2026 --
   * `claims_supported` Helpdesk memuat `sub`, `email`, `name`,
   * `preferred_username`, `nickname`, `groups`, `role`, dan `scopes_supported`
   * hanya `openid`, `profile`, `email`. Tak ada klaim `phone_number` dan tak
   * ada scope `phone`, jadi tak ada yang bisa disalin.
   *
   * OPSIONAL dengan sengaja. Nomor HP bukan syarat menilai layanan publik, dan
   * mewajibkannya berarti menutup survei bagi orang yang tak ingin memberinya.
   *
   * Aturan bentuknya SATU dengan jalur publik (`NOMOR_HP_REGEX`), bukan
   * disalin: dua aturan yang berbeda membuat nomor yang sama diterima di satu
   * gerbang dan ditolak di gerbang lain.
   */
  @ApiPropertyOptional({
    description: 'Nomor HP pengisi (08xx, 628xx, atau +628xx). Kosong bila tak diisi',
  })
  @IsOptional()
  @IsString()
  @Matches(NOMOR_HP_REGEX, {
    message: 'Nomor HP tidak dikenali. Contoh bentuk yang diterima: 081234567890',
  })
  nomorHp?: string;
}
