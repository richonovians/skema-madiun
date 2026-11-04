import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { STATUS_WAJIB_CATATAN } from '../alur-status.util';

export class UpdateComplaintStatusDto {
  /**
   * `terkirim` sengaja TIDAK ditawarkan: ia tak pernah menjadi status
   * berjalan, hanya baris pertama riwayat. `@IsEnum` tetap menerimanya secara
   * tipe, dan yang menolaknya adalah tabel transisi di service -- tak ada
   * satu pun status yang boleh berpindah ke sana.
   */
  @ApiProperty({
    enum: [
      ComplaintStatus.menunggu_verifikasi,
      ComplaintStatus.diverifikasi,
      ComplaintStatus.sedang_ditindaklanjuti,
      ComplaintStatus.selesai,
      ComplaintStatus.ditolak,
      ComplaintStatus.perlu_perbaikan,
    ],
  })
  @IsEnum(ComplaintStatus)
  status: ComplaintStatus;

  @ApiPropertyOptional({
    maxLength: 1000,
    description: `Catatan petugas. WAJIB bila status salah satu dari: ${STATUS_WAJIB_CATATAN.join(', ')}. Disimpan pada baris riwayat, bukan sebagai balasan percakapan.`,
  })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  catatan?: string;
}
