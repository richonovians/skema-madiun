import { ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, Min } from 'class-validator';
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

  /**
   * Kotak masuk triase (6 September 2026): hanya pengaduan yang BELUM punya OPD
   * tujuan. Seperti `opdId`, ia di-AND-kan dengan penyaring kepemilikan
   * sehingga tak dapat dipakai melebarkan akses.
   */
  @ApiPropertyOptional({ description: 'Hanya pengaduan yang belum punya OPD tujuan' })
  @IsOptional()
  // Nilai datang dari query string, jadi konversinya EKSPLISIT --
  // `@Type(() => Boolean)` tak dipakai karena Boolean('false') === true, yang
  // akan membuat setiap daftar pengaduan tiba-tiba tersaring.
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  tanpaOpd?: boolean;
}
