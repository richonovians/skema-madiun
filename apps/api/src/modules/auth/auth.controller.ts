import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiExcludeEndpoint, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuditService } from '../audit/audit.service';
import { AuthService } from './auth.service';
import { ConsentService } from './consent.service';
import { DevLoginDto } from './dto/dev-login.dto';
import { SsoCallbackQueryDto } from './dto/sso-callback-query.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { MeEntity } from './entities/me.entity';
import { SessionEntity } from './entities/session.entity';
import { NonProductionGuard } from './guards/non-production.guard';
import { SessionCookieService } from './session/session-cookie.service';
import { SsoService } from './sso.service';

/**
 * Batas laju endpoint masuk (2026-08-28). Lebih ketat daripada batas global
 * 100/menit (THROTTLE_LIMIT), dan baru benar-benar bekerja PER-IP sejak
 * `app.trustProxyHops` dinyalakan — sebelum itu seluruh pengguna terhitung
 * sebagai satu IP di belakang nginx. Lihat configuration.ts.
 *
 * `SSO_PER_MINUTE` sengaja tetap longgar. Di jaringan seluler Indonesia sangat
 * banyak warga berbagi satu IP publik (CGNAT), jadi batas yang "aman" di atas
 * kertas justru menolak orang yang benar-benar ingin masuk — dan gagalnya
 * terlihat seperti aplikasi rusak, bukan seperti perlindungan. 60/menit tetap
 * memangkas jalur amplifikasi (satu-satunya di aplikasi ini: `GET
 * /auth/sso/login` memicu permintaan keluar ke Helpdesk tanpa autentikasi
 * apa pun) tanpa menghalangi lonjakan pemakaian yang wajar.
 */
const SSO_PER_MINUTE = { default: { limit: 60, ttl: 60_000 } };
/**
 * `dev-login` lebih ketat lagi, dan bukan karena bebannya: ia MENERBITKAN SESI
 * untuk email mana pun yang ada di basis data, tanpa kata sandi. Pada batas
 * global itu berarti 100 penebakan email per menit per IP. Ia memang 404 di
 * produksi (NonProductionGuard), tapi staging tetap memuat data sungguhan.
 *
 * 30, bukan 10 — dan angka itu dipilih setelah mencobanya: pengujian peran
 * berganti-ganti (dan skrip peramban milik proyek ini sendiri) rutin melakukan
 * belasan login dalam satu menit, sehingga 10/menit menjatuhkan 429 pada
 * pemakaian yang sah. Batas ketat yang menghalangi alat uji proyeknya sendiri
 * tak akan bertahan; ia hanya akan dicabut orang berikutnya. Yang sesungguhnya
 * menjaga endpoint ini adalah NonProductionGuard, bukan angka di sini —
 * throttle-nya polisi tidur, bukan pintu.
 */
const DEV_LOGIN_PER_MINUTE = { default: { limit: 30, ttl: 60_000 } };

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly ssoService: SsoService,
    private readonly sessionCookie: SessionCookieService,
    private readonly audit: AuditService,
    private readonly consentService: ConsentService,
  ) {}

  /**
   * Login sementara tanpa SSO (dev/staging) — 404 di production (lihat NonProductionGuard).
   * Digantikan callback SSO OAuth2 saat spec Helpdesk tersedia. Publik (tak perlu Bearer)
   * karena tujuannya justru MENERBITKAN Bearer token itu sendiri.
   */
  @Public()
  @UseGuards(NonProductionGuard)
  @Post('dev-login')
  @Throttle(DEV_LOGIN_PER_MINUTE)
  @ApiOkResponse({ type: SessionEntity })
  devLogin(@Body() dto: DevLoginDto): Promise<SessionEntity> {
    return this.authService.devLogin(dto);
  }

  /**
   * Langkah 1 SSO: alihkan pengguna ke halaman login Helpdesk.
   *
   * Publik dan berupa REDIRECT, bukan JSON — ini dibuka langsung oleh peramban
   * lewat navigasi (tombol "Masuk"), bukan dipanggil axios. Perlu diketahui
   * pengguna akan mendarat di `helpdesk.madiunkab.go.id`, bukan tetap di SKEMA.
   *
   * GAGALNYA JUGA BERUPA REDIRECT (2026-08-28) — aturan yang sama dengan
   * `ssoCallback` di bawah, dan sebelumnya memang belum diterapkan di sini:
   * endpoint ini melempar galatnya seperti endpoint JSON biasa, sehingga tombol
   * utama aplikasi menampilkan `{"success":false,"statusCode":503,...}` kepada
   * pengguna di tab kosong. Dua kegagalan yang nyata-nyata bisa terjadi:
   * kredensial belum diisi (keadaan sekarang, 503) dan Helpdesk tak dapat
   * dihubungi (dokumen penemuan OIDC diambil lewat jaringan di setiap
   * permintaan). Keduanya kini mendarat di halaman `/sso/callback` yang sudah
   * punya pesan, tombol "Coba masuk lagi", dan tombol pulang.
   */
  @Public()
  @Get('sso/login')
  @Throttle(SSO_PER_MINUTE)
  @ApiExcludeEndpoint()
  async ssoLogin(@Res() res: Response): Promise<void> {
    try {
      const { redirectUrl, setCookie } = await this.ssoService.beginLogin();
      res.setHeader('Set-Cookie', setCookie);
      res.redirect(HttpStatus.FOUND, redirectUrl);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Proses masuk gagal';
      this.logger.error(`Mulai SSO gagal: ${message}`);
      // Cookie state SENGAJA tidak disentuh — beda dari callback yang memang
      // harus membuangnya. Di sini belum ada state yang terkirim (beginLogin
      // gagal sebelum responsnya jadi), dan membuang yang ada berarti mematikan
      // percobaan masuk yang mungkin sedang berjalan di tab lain: pengguna yang
      // sudah berada di halaman Helpdesk kembali ke callback tanpa cookie.
      res.redirect(HttpStatus.FOUND, this.ssoService.buildFailureRedirect(message));
    }
  }

  /**
   * Langkah 2 SSO: Helpdesk mengembalikan pengguna ke sini.
   *
   * SELALU membalas redirect, bahkan saat gagal — TIDAK PERNAH melempar galat
   * mentah. Alasannya: yang membuka alamat ini adalah peramban pengguna, bukan
   * kode. Melempar 400 berarti warga menatap JSON galat di tab kosong; pesannya
   * dititipkan ke frontend agar dapat ditampilkan sebagaimana mestinya.
   */
  @Public()
  @Get('sso/callback')
  @Throttle(SSO_PER_MINUTE)
  @ApiExcludeEndpoint()
  async ssoCallback(
    @Query() query: SsoCallbackQueryDto,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // Pengguna membatalkan di halaman Helpdesk, atau klien ditolak. Bukan galat
    // program — dikembalikan apa adanya tanpa menyentuh basis data.
    if (query.error) {
      this.logger.warn(
        `Callback SSO membawa galat: ${query.error} ${query.error_description ?? ''}`,
      );
      res.redirect(
        HttpStatus.FOUND,
        this.ssoService.buildFailureRedirect(query.error_description ?? query.error),
      );
      return;
    }

    try {
      const { token, clearCookie } = await this.ssoService.completeLogin(
        query.code,
        query.state,
        req.headers.cookie,
      );
      // DUA header Set-Cookie sekaligus (array, bukan string): cookie `state`
      // dibuang karena sekali pakai, cookie `session` dipasang sebagai hasil
      // login. Keduanya harus menumpang respons redirect INI -- tak ada
      // permintaan lain sesudahnya yang bisa memasangnya.
      res.setHeader('Set-Cookie', [clearCookie, this.sessionCookie.build(token)]);
      res.redirect(
        HttpStatus.FOUND,
        this.ssoService.buildSuccessRedirect(this.sessionCookie.expiresAt(token)),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Proses masuk gagal';
      this.logger.error(`Callback SSO gagal: ${message}`);
      // Cookie state ikut dibuang walau gagal — ia sekali pakai, dan
      // membiarkannya hidup berarti percobaan berikutnya memakai state basi.
      res.setHeader('Set-Cookie', this.ssoService.clearStateCookie());
      res.redirect(HttpStatus.FOUND, this.ssoService.buildFailureRedirect(message));
    }
  }

  /**
   * Keluar sesi.
   *
   * Kini WAJIB dipanggil, bukan lagi sekadar "kontrak stabil" (2026-08-27): sejak
   * sesi SSO dititipkan pada cookie `HttpOnly`, frontend TIDAK BISA lagi
   * membuangnya sendiri lewat `document.cookie` — hanya server yang dapat
   * menghapus cookie yang ia setel HttpOnly. Sebelum ini logout memang murni
   * urusan klien (buang localStorage), dan itu tak lagi cukup.
   *
   * `passthrough: true` supaya badan JSON `{ success: true }` tetap dikembalikan
   * seperti sebelumnya — kontrak frontend tak berubah, hanya bertambah header.
   *
   * Audit dicatat lewat panggilan LANGSUNG, bukan dekorator `@Audit` seperti
   * handler admin lainnya (2026-08-27). Alasannya: `AuditInterceptor` mengambil
   * aktor dari request, dan itu berfungsi di sini — tapi TIDAK di callback SSO
   * yang `@Public()` dan belum punya pengguna saat interceptor berjalan. Agar
   * `login` dan `logout` tercatat lewat satu jalur yang sama (dan mudah
   * ditelusuri bersamaan), keduanya memakai pemanggilan langsung.
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: CurrentUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: true }> {
    res.setHeader('Set-Cookie', this.sessionCookie.clear());
    await this.audit.record(user.userId, 'logout', 'auth', {});
    return this.authService.logout();
  }

  /**
   * Catat persetujuan pemrosesan data pribadi (UU PDP).
   *
   * Terbuka untuk SEMUA peran terautentikasi, bukan hanya `responden` yang
   * diwajibkan: memanggilnya dari peran lain tak berbahaya (idempoten, dan
   * `consentRequired` mereka memang selalu false), sementara membatasinya
   * dengan `@Roles` justru akan dilewati bypass penuh milik kabupaten/superuser
   * di RolesGuard — pembatasan yang tampak ada tapi tak berlaku.
   *
   * Idempoten: pemanggilan ulang mengembalikan waktu persetujuan yang SUDAH ada
   * tanpa menggesernya. Lihat ConsentService.record.
   */
  @Post('consent')
  @HttpCode(HttpStatus.OK)
  async consent(@CurrentUser() user: CurrentUser): Promise<{ consentAt: string }> {
    const consentAt = await this.consentService.record(user);
    return { consentAt: consentAt.toISOString() };
  }

  /** Profil pengguna aktif (semua peran terautentikasi). */
  @Get('me')
  @ApiOkResponse({ type: MeEntity })
  me(@CurrentUser() user: CurrentUser): Promise<MeEntity> {
    return this.authService.getMe(user);
  }

  /** Ubah profil/data diri (demografis khusus responden). */
  @Patch('profile')
  @ApiOkResponse({ type: MeEntity })
  updateProfile(
    @CurrentUser() user: CurrentUser,
    @Body() dto: UpdateProfileDto,
  ): Promise<MeEntity> {
    return this.authService.updateProfile(user, dto);
  }
}
