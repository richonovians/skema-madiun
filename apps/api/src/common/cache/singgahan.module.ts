import { Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PENYIMPAN_SINGGAHAN } from './penyimpan-singgahan.interface';
import type { PenyimpanSinggahan } from './penyimpan-singgahan.interface';
import { PenyimpanSinggahanNonaktif } from './penyimpan-singgahan.nonaktif';
import { PenyimpanSinggahanRedis } from './penyimpan-singgahan.redis';

/**
 * Menyediakan `PENYIMPAN_SINGGAHAN`: Redis bila `REDIS_URL` terisi, selain itu
 * NONAKTIF (tiap permintaan dihitung ulang).
 *
 * Percabangannya di SATU tempat, meniru SessionModule dan ThrottlerModule.
 * Modul ini diimpor oleh modul yang memakainya (DashboardModule), dan karena
 * modul Nest bersifat singleton, koneksi Redis-nya dibagi bila kelak modul lain
 * ikut mengimpornya -- bukan satu koneksi baru per pemakai.
 *
 * Yang menolak ketiadaan Redis di PRODUKSI tetap gerbang boot
 * `periksaPenyimpanSesi`; di sini ketiadaannya hanya berarti singgahan mati,
 * yang aman karena gagal-terbuka.
 */
@Module({
  providers: [
    {
      provide: PENYIMPAN_SINGGAHAN,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PenyimpanSinggahan => {
        const url = config.get<string>('redis.url');
        if (!url) {
          new Logger('SinggahanModule').warn(
            'REDIS_URL kosong: singgahan NONAKTIF, statistik publik dihitung ulang tiap permintaan.',
          );
          return new PenyimpanSinggahanNonaktif();
        }
        return new PenyimpanSinggahanRedis(new Redis(url, { maxRetriesPerRequest: 2 }));
      },
    },
  ],
  exports: [PENYIMPAN_SINGGAHAN],
})
export class SinggahanModule {}
