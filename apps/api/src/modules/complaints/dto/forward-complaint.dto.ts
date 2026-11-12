import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, Min } from 'class-validator';
import { COMPLAINT_CATEGORIES } from '../../reference/reference.constants';

const KATEGORI_KODE = COMPLAINT_CATEGORIES.map((k) => k.kode);

/**
 * Body `PATCH /complaints/:id/opd` — meneruskan pengaduan yang belum bertujuan
 * ke OPD yang berwenang (6 September 2026).
 *
 * `opdId` WAJIB dan tak boleh null: endpoint ini justru ada untuk MENGISI
 * tujuan. Mengosongkan kembali tujuan sebuah pengaduan bukan alur yang diminta,
 * dan membiarkannya berarti tiket bisa dikembalikan ke antrean triase setelah
 * OPD-nya mulai menangani.
 */
export class ForwardComplaintDto {
  @ApiProperty({ description: 'Id OPD yang berwenang menangani pengaduan ini' })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  opdId: number;

  /**
   * Kategori baru, WAJIB HANYA BILA TINGKATNYA BERUBAH (BUG-077, keputusan
   * pengguna 12 November 2026). Tiket kecamatan yang diteruskan ke dinas
   * berpindah ke tingkat kabupaten, dan kategori `kec_*`-nya tak lagi sah di
   * sana. Penerusan setingkat tak perlu mengirimnya.
   *
   * Opsional di DTO karena wajib-tidaknya bergantung pada tingkat OPD tujuan,
   * yang baru diketahui service. Kesepadanannya ditegakkan
   * `assertKategoriSesuaiTingkat`, sama dengan `AlihkanComplaintDto`.
   */
  @ApiPropertyOptional({
    description:
      'Kode kategori baru. Wajib bila tingkat OPD tujuan berbeda dari tingkat pengaduan, dan harus milik tingkat OPD tujuan',
  })
  @IsOptional()
  @IsIn(KATEGORI_KODE)
  kategori?: string;
}
