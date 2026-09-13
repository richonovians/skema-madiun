import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsIn, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListNotificationQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Filter hanya yang belum dibaca' })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;

  /**
   * Urutan menurut waktu dibuat (13 September 2026). Sebelumnya dipatok mati
   * `desc` di service, sehingga mencapai notifikasi terlama menuntut menyusuri
   * halaman demi halaman.
   */
  @ApiPropertyOptional({
    description: 'Urutan menurut waktu dibuat',
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sort?: 'asc' | 'desc';

  /**
   * Rentang waktu sebagai INSTAN ISO, bukan nama preset seperti "30 hari
   * terakhir". Batasnya dihitung frontend dari jam peramban pengguna, jadi
   * "hari ini" berarti hari ini di tempat dia berada -- backend tak perlu
   * menebak zona waktu siapa pun.
   */
  @ApiPropertyOptional({ description: 'Batas bawah waktu dibuat (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Batas atas waktu dibuat (ISO 8601)' })
  @IsOptional()
  @IsDateString()
  to?: string;
}
