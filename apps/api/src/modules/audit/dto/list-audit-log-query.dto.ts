import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Matches, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

export class ListAuditLogQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter entitas (mis. "survey", "user", "complaint")' })
  @IsOptional()
  @IsString()
  entitas?: string;

  @ApiPropertyOptional({ description: 'Filter id pelaku aksi' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  actorId?: number;

  @ApiPropertyOptional({ description: 'Filter aksi (mis. "create", "update", "delete", "login")' })
  @IsOptional()
  @IsString()
  aksi?: string;

  @ApiPropertyOptional({ description: 'Pencarian teks (nama pengguna, aksi, atau modul)' })
  @IsOptional()
  @IsString()
  search?: string;

  /**
   * `@IsDateString()`, bukan `@IsString()` (BUG-050, 28 Oktober 2026): teks
   * apa pun yang bukan tanggal sampai ke `new Date(...)` di service, menjadi
   * `Invalid Date`, lalu ditolak Prisma sebagai 500. Kini 400.
   *
   * Diperketat 23 November 2026 menjadi `YYYY-MM-DD` saja dan tanggal yang ada
   * di kalender (`strict`). Service membacanya sebagai hari WIB, jadi bentuk
   * berjam tak punya arti di sana, dan tanpa `strict` '2026-02-31' lolos lalu
   * digulung diam-diam menjadi 3 Maret.
   */
  @ApiPropertyOptional({ description: 'Filter tanggal mulai (YYYY-MM-DD, hari WIB)' })
  @IsOptional()
  @Matches(POLA_TANGGAL, { message: 'startDate harus berformat YYYY-MM-DD' })
  @IsDateString({ strict: true })
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter tanggal selesai (YYYY-MM-DD, hari WIB, inklusif)' })
  @IsOptional()
  @Matches(POLA_TANGGAL, { message: 'endDate harus berformat YYYY-MM-DD' })
  @IsDateString({ strict: true })
  endDate?: string;
}
