import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { PENYIMPAN_CABUT_LAMPIRAN } from './penyimpan-cabut-lampiran.interface';
import { PenyimpanCabutLampiranMemori } from './penyimpan-cabut-lampiran.memori';
import { PenyimpanCabutLampiranRedis } from './penyimpan-cabut-lampiran.redis';

/**
 * GLOBAL, berbeda dari `SinggahanModule` yang diimpor per modul.
 *
 * Pemakainya bukan sebuah service melainkan middleware `/uploads/*` di
 * `app.setup.ts`, yang mengambilnya lewat `app.get()` dan karena itu menuntut
 * penyedianya terlihat dari root. Pencabutannya sendiri ditulis dari
 * `AuthService`, yang juga tak punya hubungan modul dengan unggahan.
 *
 * MEMORI DI PENGEMBANGAN, Redis di produksi, dan gerbang boot
 * `periksaPenyimpanSesi` yang sudah ada menolak produksi tanpa `REDIS_URL`
 * sehingga tak perlu gerbang kedua: keduanya memakai sambungan yang sama dan
 * mati bersama.
 */
@Global()
@Module({
  providers: [
    {
      provide: PENYIMPAN_CABUT_LAMPIRAN,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // TTL-nya mengikuti umur tautan: sesudah tautan terpanjang kedaluwarsa,
        // catatan pencabutan tak lagi punya pekerjaan.
        const ttl = config.get<number>('upload.signedUrlTtlSeconds') ?? 3600;
        const url = config.get<string>('redis.url');
        if (url && url.trim() !== '') {
          return new PenyimpanCabutLampiranRedis(new Redis(url), ttl);
        }
        new Logger('CabutLampiranModule').warn(
          'REDIS_URL kosong: pencabutan tautan lampiran DALAM MEMORI, tidak dibagi antarproses.',
        );
        return new PenyimpanCabutLampiranMemori(ttl);
      },
    },
  ],
  exports: [PENYIMPAN_CABUT_LAMPIRAN],
})
export class CabutLampiranModule {}
