import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import Redis from 'ioredis';
import { PenerbitSesi } from './penerbit-sesi.service';
import { PENYIMPAN_SESI } from './penyimpan-sesi.interface';
import type { PenyimpanSesi } from './penyimpan-sesi.interface';
import { PenyimpanSesiMemori } from './penyimpan-sesi.memori';
import { PenyimpanSesiRedis } from './penyimpan-sesi.redis';
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
        //
        // JENDELA MENGANGGUR, bukan pagu mutlak (17 September 2026).
        // `SessionService` selalu menyebut umurnya sendiri secara tersurat saat
        // menandatangani; nilai ini bakunya, supaya penandatanganan lain yang
        // kelak memakai JwtService ini berumur pendek, bukan sepanjang pagu.
        signOptions: { expiresIn: (config.get<number>('session.idleMinutes') ?? 60) * 60 },
      }),
    }),
  ],
  providers: [
    SessionService,
    SessionCookieService,
    PenerbitSesi,
    /**
     * Redis bila `REDIS_URL` terisi, selain itu dalam memori.
     *
     * Percabangannya di SATU tempat ini saja, meniru AUTH_PROVIDER di
     * AuthModule: modul lain tak pernah tahu mana yang aktif, dan itulah guna
     * antarmukanya. Yang menolak memori di PRODUKSI bukan baris ini melainkan
     * gerbang boot, supaya kegagalannya terjadi sebelum porta dibuka, bukan
     * pada permintaan pertama.
     */
    {
      provide: PENYIMPAN_SESI,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PenyimpanSesi => {
        const url = config.get<string>('redis.url');
        if (!url) {
          new Logger('SessionModule').warn(
            'REDIS_URL kosong: daftar pencabutan sesi disimpan DALAM MEMORI. Sesi hilang saat proses mati dan tak dibagi antarproses.',
          );
          return new PenyimpanSesiMemori();
        }
        return new PenyimpanSesiRedis(new Redis(url, { maxRetriesPerRequest: 2 }));
      },
    },
  ],
  // `JwtModule` ikut diekspor (2026-08-27) supaya `JwtService` yang SUDAH
  // terkonfigurasi di sini (kunci & masa berlaku dari env) dapat disuntikkan ke
  // SsoStateService di AuthModule. Alternatifnya mendaftarkan JwtModule kedua di
  // sana, dan itu berarti dua tempat mengatur kunci yang sama -- tepat jenis
  // duplikasi yang membuat rotasi kunci diam-diam gagal separuh.
  exports: [SessionService, SessionCookieService, PenerbitSesi, PENYIMPAN_SESI, JwtModule],
})
export class SessionModule {}
