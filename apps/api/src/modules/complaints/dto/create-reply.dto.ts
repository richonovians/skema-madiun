import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * `pesan` opsional (2026-08-06, laporan bug user "kirim foto tanpa teks tidak
 * terkirim") -- balasan boleh berupa lampiran saja. `ComplaintsService.addReply`
 * yang menegakkan aturan bisnis "pesan ATAU lampiran wajib ada salah satu"
 * (400 jelas bila keduanya kosong), bukan class-validator di sini (perlu tahu
 * jumlah file, di luar cakupan DTO field ini).
 */
export class CreateReplyDto {
  @ApiPropertyOptional({ maxLength: 2000 })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  pesan?: string;
}
