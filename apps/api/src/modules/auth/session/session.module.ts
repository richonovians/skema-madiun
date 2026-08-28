import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { SessionCookieService } from './session-cookie.service';
import { SessionService } from './session.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('session.jwtSecret'),
        // expiresIn dalam detik (number) — hindari template literal string yang tak
        // cocok dengan tipe StringValue milik @nestjs/jwt.
        signOptions: { expiresIn: (config.get<number>('session.ttlHours') ?? 24) * 3600 },
      }),
    }),
  ],
  providers: [SessionService, SessionCookieService],
  // `JwtModule` ikut diekspor (2026-08-27) supaya `JwtService` yang SUDAH
  // terkonfigurasi di sini (kunci & masa berlaku dari env) dapat disuntikkan ke
  // SsoStateService di AuthModule. Alternatifnya mendaftarkan JwtModule kedua di
  // sana, dan itu berarti dua tempat mengatur kunci yang sama -- tepat jenis
  // duplikasi yang membuat rotasi kunci diam-diam gagal separuh.
  exports: [SessionService, SessionCookieService, JwtModule],
})
export class SessionModule {}
