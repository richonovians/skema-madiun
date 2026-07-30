import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateComplaintStatusDto {
  @ApiProperty({
    enum: [ComplaintStatus.diproses, ComplaintStatus.selesai, ComplaintStatus.ditolak],
  })
  @IsEnum(ComplaintStatus)
  status: ComplaintStatus;

  @ApiPropertyOptional({
    maxLength: 1000,
    description: 'Catatan/alasan — WAJIB bila status=ditolak, dicatat sebagai tanggapan',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  catatan?: string;
}
