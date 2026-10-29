import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { JenisSurvei, MetodeNilai, TujuanSurvei } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * Badan `PATCH /surveys/:id/jenis`. Satu-satunya jalan mengganti jenis survei,
 * hanya selagi draf tanpa jawaban; `PATCH /surveys/:id` tetap menolak `jenis`.
 *
 * Sampai 26 Oktober 2026 hanya SKM -> Custom yang ada, dan ketiga medan wajib di
 * sini. Sejak arah Custom -> SKM dibuka, `tujuan` dan `metodeNilai` OPSIONAL di
 * tingkat DTO: wajib untuk tujuan `custom`, terlarang untuk tujuan SKM. Aturan
 * lintas-medan itu ditegakkan `assertPengaturanNilaiBuat`, satu tempat yang sama
 * dengan saat membuat survei.
 */
export class ChangeSurveyJenisDto {
  @ApiProperty({
    enum: JenisSurvei,
    description:
      'Jenis tujuan. `custom` dari survei SKM, atau `skm_permenpanrb` dari survei Custom.',
  })
  @IsEnum(JenisSurvei)
  jenis: JenisSurvei;

  @ApiPropertyOptional({
    enum: TujuanSurvei,
    description:
      'Wajib bila jenis tujuan `custom` (kamus kata kategori hasil). Ditolak bila jenis tujuan SKM.',
  })
  @IsOptional()
  @IsEnum(TujuanSurvei)
  tujuan?: TujuanSurvei;

  @ApiPropertyOptional({
    enum: MetodeNilai,
    description:
      'Wajib bila jenis tujuan `custom`: `rata_rata` ("3,40 / 4") atau `indeks_persen` ("85%"). Ditolak bila jenis tujuan SKM.',
  })
  @IsOptional()
  @IsEnum(MetodeNilai)
  metodeNilai?: MetodeNilai;
}
