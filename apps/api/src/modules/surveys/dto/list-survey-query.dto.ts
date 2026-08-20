import { ApiPropertyOptional } from '@nestjs/swagger';
import { SurveyStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListSurveyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: SurveyStatus })
  @IsOptional()
  @IsEnum(SurveyStatus)
  status?: SurveyStatus;

  /**
   * Persempit ke satu OPD (2026-08-20). Dibutuhkan Superuser yang masuk sebagai
   * Admin OPD untuk satu OPD tertentu -- tanpa ini area OPD menampilkan survei
   * SELURUH OPD, karena penyaring kepemilikan memberi peran berhak penuh cakupan
   * tanpa batas.
   *
   * TIDAK dapat dipakai untuk melebarkan akses: filter ini di-AND-kan dengan
   * penyaring kepemilikan, jadi akun Admin OPD yang mengirim id OPD lain
   * mendapat daftar kosong, bukan data OPD itu.
   */
  @ApiPropertyOptional({ description: 'Persempit ke satu OPD (tidak melebarkan akses)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  opdId?: number;
}
