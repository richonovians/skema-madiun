import { ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListComplaintQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ComplaintStatus })
  @IsOptional()
  @IsEnum(ComplaintStatus)
  status?: ComplaintStatus;

  /**
   * Persempit ke satu OPD tujuan (2026-08-20) -- dibutuhkan Superuser yang masuk
   * sebagai Admin OPD untuk satu OPD tertentu. Sama seperti pada daftar survei,
   * filter ini di-AND-kan dengan penyaring kepemilikan sehingga TIDAK dapat
   * dipakai melebarkan akses (warga pelapor tetap hanya melihat miliknya).
   */
  @ApiPropertyOptional({ description: 'Persempit ke satu OPD (tidak melebarkan akses)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  opdId?: number;
}
