import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { Public } from '../../../common/decorators/public.decorator';
import { AuthService } from '../auth.service';
import { DevLoginDto } from '../dto/dev-login.dto';
import { SessionEntity } from '../entities/session.entity';
import { DevLoginGuard } from '../guards/dev-login.guard';
import { NonProductionGuard } from '../guards/non-production.guard';
import { perangkatDari } from '../session/perangkat.util';

/**
 * `dev-login` lebih ketat daripada batas global, dan bukan karena bebannya: ia
 * MENERBITKAN SESI untuk email mana pun yang ada di basis data, tanpa kata
 * sandi. Pada batas global itu berarti 100 penebakan email per menit per IP.
 * Rutenya tak terdaftar di produksi, tapi staging tetap memuat data sungguhan.
 *
 * 30, bukan 10 — dan angka itu dipilih setelah mencobanya: pengujian peran
 * berganti-ganti (dan skrip peramban milik proyek ini sendiri) rutin melakukan
 * belasan login dalam satu menit, sehingga 10/menit menjatuhkan 429 pada
 * pemakaian yang sah. Batas ketat yang menghalangi alat uji proyeknya sendiri
 * tak akan bertahan; ia hanya akan dicabut orang berikutnya. Yang sesungguhnya
 * menjaga endpoint ini adalah ketiadaannya di produksi, bukan angka di sini —
 * throttle-nya polisi tidur, bukan pintu.
 */
const DEV_LOGIN_PER_MINUTE = { default: { limit: 30, ttl: 60_000 } };

/**
 * Login sementara tanpa SSO (dev/staging). Controller sendiri sejak 16
 * November 2026 (BUG-066), dipindah dari `AuthController`, supaya modulnya
 * dapat TIDAK DIDAFTARKAN sama sekali bila `devLoginAktif` palsu -- lihat
 * `AppModule`.
 *
 * Sebelumnya rutenya selalu terdaftar dan ditolak penjaga dengan 404. Status
 * itu benar, tetapi penjaga global `ThrottlePenggunaGuard` berjalan lebih dulu
 * daripada penjaga tingkat rute, sehingga rute yang "tak ada" ini tetap
 * membawa header `X-RateLimit-Limit`, menjawab 429 sesudah permintaan ke-30,
 * dan berpesan "Not Found" alih-alih "Cannot POST <jalur>" bawaan Express.
 * Ketiganya memastikan dari luar bahwa produksi memuat penerbit sesi tanpa
 * kata sandi. Rute yang tak terdaftar tak pernah melewati penjaga mana pun.
 *
 * `NonProductionGuard` dan `DevLoginGuard` DIPERTAHANKAN sebagai lapis kedua.
 * Dalam keadaan normal keduanya tak pernah menolak (modul ini hanya ada bila
 * keduanya pasti meloloskan), tetapi bila kelak ada yang mendaftarkan modul ini
 * tanpa syarat, rutenya tetap tertutup -- hanya penyembunyiannya yang hilang.
 *
 * Publik (tak perlu Bearer) karena tujuannya justru MENERBITKAN Bearer token.
 */
@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class DevLoginController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @UseGuards(NonProductionGuard, DevLoginGuard)
  @Post('dev-login')
  @ApiOperation({
    summary: 'Login sementara tanpa SSO untuk dev/staging. Tidak tersedia di produksi.',
  })
  @Throttle(DEV_LOGIN_PER_MINUTE)
  @ApiOkResponse({ type: SessionEntity })
  devLogin(@Body() dto: DevLoginDto, @Req() req: Request): Promise<SessionEntity> {
    return this.authService.devLogin(dto, perangkatDari(req));
  }
}
