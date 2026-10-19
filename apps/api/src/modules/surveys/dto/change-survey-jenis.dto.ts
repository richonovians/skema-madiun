import { ApiProperty } from '@nestjs/swagger';
import { JenisSurvei, MetodeNilai, TujuanSurvei } from '@prisma/client';
import { IsEnum } from 'class-validator';

/**
 * Badan `PATCH /surveys/:id/jenis` (8 Oktober 2026). Satu-satunya jalan mengganti
 * jenis survei, dan hanya SKM -> Custom selagi draf tanpa jawaban; `PATCH
 * /surveys/:id` tetap menolak `jenis`. Ketiganya wajib: Custom selalu menuntut
 * tujuan dan metode nilai, sama seperti saat membuat survei Custom.
 */
export class ChangeSurveyJenisDto {
  @ApiProperty({
    enum: JenisSurvei,
    description:
      'Jenis tujuan. Hanya `custom` diterima: SKM tidak pernah menjadi tujuan, dan survei Custom tak dapat diganti.',
  })
  @IsEnum(JenisSurvei)
  jenis: JenisSurvei;

  @ApiProperty({
    enum: TujuanSurvei,
    description: 'Tujuan survei Custom hasil penggantian (kamus kata kategori hasil).',
  })
  @IsEnum(TujuanSurvei)
  tujuan: TujuanSurvei;

  @ApiProperty({
    enum: MetodeNilai,
    description:
      'Metode tampilan Nilai Survei: `rata_rata` ("3,40 / 4") atau `indeks_persen` ("85%").',
  })
  @IsEnum(MetodeNilai)
  metodeNilai: MetodeNilai;
}
