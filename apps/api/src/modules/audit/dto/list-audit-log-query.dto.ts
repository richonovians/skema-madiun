import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

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

  @ApiPropertyOptional({ description: 'Filter tanggal mulai (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Filter tanggal selesai (YYYY-MM-DD)' })
  @IsOptional()
  @IsString()
  endDate?: string;
}
