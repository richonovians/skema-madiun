import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DashboardIkmQueryDto {
  @ApiPropertyOptional({ maxLength: 20, description: 'Filter periode (mis. "2026")' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  periode?: string;

  @ApiPropertyOptional({ maxLength: 50, description: 'Filter jenis layanan OPD' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  jenisLayanan?: string;
}
