import { ApiPropertyOptional } from '@nestjs/swagger';
import { TingkatPengaduan } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

/**
 * Kueri `GET /ref/complaint-categories` (4 November 2026).
 *
 * `tingkat` OPSIONAL dengan sengaja. Formulir pengaduan mengambil daftar
 * lengkapnya SEKALI lalu menyaring sendiri saat tab tingkat berpindah --
 * memanggil ulang per perpindahan tab membuat dropdown kedip dan menampilkan
 * "Memuat kategori..." pada data yang sudah ada di memori. Penyaring ini untuk
 * pemanggil lain (ekspor, alat bantu) dan untuk membuat kontraknya tersurat di
 * Swagger.
 */
export class ListComplaintCategoryQueryDto {
  @ApiPropertyOptional({
    enum: TingkatPengaduan,
    description: 'Persempit ke satu tingkat. Tanpa ini, seluruh kategori dikembalikan.',
  })
  @IsOptional()
  @IsEnum(TingkatPengaduan)
  tingkat?: TingkatPengaduan;
}
