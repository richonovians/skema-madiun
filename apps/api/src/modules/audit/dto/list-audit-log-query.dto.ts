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
}
