import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class ListActiveSurveyQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Filter survei aktif milik satu OPD saja (INT-45: instansi -> survei aktif)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  opdId?: number;
}
