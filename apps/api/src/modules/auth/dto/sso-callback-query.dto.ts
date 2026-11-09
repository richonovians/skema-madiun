import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Query yang dikirim Helpdesk ke `GET /auth/sso/callback`.
 *
 * SELURUH field opsional dengan sengaja: Helpdesk mengembalikan `code`+`state`
 * saat berhasil, tetapi `error`+`error_description` saat pengguna membatalkan
 * atau klien ditolak. Menandai `code` wajib akan membuat pembatalan yang normal
 * berakhir sebagai 400 dari ValidationPipe -- pengguna melihat galat teknis alih-alih
 * dikembalikan dengan pesan yang bisa dibaca. Kelengkapannya diperiksa
 * SsoService, yang dapat membedakan keduanya.
 *
 * `MaxLength` dipasang sebagai pagar dasar: nilai-nilai ini datang dari luar dan
 * ikut masuk log. Ia HANYA membatasi ukuran, bukan isi: CR, LF, dan ESC lolos
 * dari sini, dan dinetralkan di titik log oleh `amankanLog`
 * (`common/log/aman-log.ts`, temuan `sso-callback-error-log-forging`,
 * 9 November 2026). Sengaja tidak ditolak dengan `@Matches`: callback ini
 * wajib selalu membalas redirect, sedangkan 400 dari ValidationPipe membuat
 * warga menatap JSON galat di tab kosong.
 */
export class SsoCallbackQueryDto {
  @ApiPropertyOptional({ description: 'Authorization code dari Helpdesk' })
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  code?: string;

  @ApiPropertyOptional({
    description: 'Nilai state yang tadi kami kirim; wajib cocok dengan cookie',
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  state?: string;

  @ApiPropertyOptional({ description: 'Kode galat OAuth2, mis. access_denied' })
  @IsOptional()
  @IsString()
  @MaxLength(256)
  error?: string;

  @ApiPropertyOptional({ description: 'Keterangan galat dari Helpdesk' })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  error_description?: string;
}
