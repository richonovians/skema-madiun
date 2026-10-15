import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListOpdQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: 'Cari pada nama atau kode OPD (case-insensitive)' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter status keaktifan', example: true })
  @IsOptional()
  /**
   * `@Type(() => String)` WAJIB di sini, dan bukan hiasan (15 Oktober 2026).
   *
   * `app.setup.ts` menyalakan `transformOptions.enableImplicitConversion`, dan
   * class-transformer memakai tipe hasil refleksi SEBELUM memanggil
   * `@Transform` di bawah ini. Tipe refleksi medan ini `Boolean`, sehingga
   * nilainya melewati `Boolean('false')` -- yang bernilai `true` -- dan
   * `@Transform` tak pernah melihat string aslinya. Akibatnya `?isActive=false`
   * menyaring OPD AKTIF, kebalikan dari yang diminta.
   *
   * Menyatakan `String` membuat konversi implisit tak mengubah apa pun, lalu
   * `@Transform` menerjemahkan string itu sendiri. Terukur: tanpa baris ini
   * `'false' -> true`, dengan baris ini `'false' -> false`.
   */
  @Type(() => String)
  @Transform(({ value }) => (value === undefined ? undefined : value === 'true' || value === true))
  @IsBoolean()
  isActive?: boolean;
}
