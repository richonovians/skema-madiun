import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ComplaintStatus } from '@prisma/client';
import { Transform } from 'class-transformer';
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
  /**
   * DIPANGKAS LEBIH DAHULU (BUG-082). Tanpanya `'   '` bernilai truthy dan
   * lolos pemeriksaan `STATUS_WAJIB_CATATAN` di service, sehingga `ditolak`
   * dan `perlu_perbaikan` diterima tanpa alasan apa pun bagi pelapor. Hasil
   * `''` tetap lolos `@IsOptional` -- yang menolaknya service, dengan pesan
   * yang sama seperti catatan yang tidak dikirim -- dan pada status lain ia
   * tersimpan sebagai `null`. Pola yang sama dengan `AlihkanComplaintDto`.
   */
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(1000)
  catatan?: string;
}
