import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { PenyimpanSinggahan } from './penyimpan-singgahan.interface';

/** Awalan kunci singgahan. Memisahkannya dari `sesi:` dan `laju:` di keyspace yang sama. */
const AWALAN = 'singgahan:';

/** Jarak minimum antar-baris galat, milidetik. Redis padam tak boleh membanjiri log. */
const JEDA_LOG_MS = 10_000;

/**
 * `PenyimpanSinggahan` di atas Redis.
 *
 * Nilainya disimpan sebagai JSON dengan TTL (`SET ... EX`). Entity response
 * aman di-JSON-kan: BaseEntity hanya menyalin field, dan entity statistik tak
 * punya `@Exclude`/`@Transform`, sehingga hasil `JSON.parse` yang dibungkus
 * ulang `new …Entity(...)` ter-serialize identik dengan hitungan segarnya.
 *
 * GAGAL TERBUKA: lihat docblock antarmukanya. Galat Redis di sini DITELAN --
 * baca yang galat menjadi "meleset" (hitung ulang dari DB), tulis yang galat
 * diabaikan. Tak ada lemparan yang naik ke pemanggil.
 */
@Injectable()
export class PenyimpanSinggahanRedis implements PenyimpanSinggahan, OnModuleDestroy {
  private readonly logger = new Logger(PenyimpanSinggahanRedis.name);
  private galatTerakhir = 0;

  constructor(private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async ambil<T>(kunci: string): Promise<T | null> {
    try {
      const data = await this.redis.get(AWALAN + kunci);
      return data ? (JSON.parse(data) as T) : null;
    } catch (err) {
      this.catatGalat('baca', err);
      return null;
    }
  }

  async simpan<T>(kunci: string, nilai: T, ttlDetik: number): Promise<void> {
    try {
      await this.redis.set(AWALAN + kunci, JSON.stringify(nilai), 'EX', Math.max(1, ttlDetik));
    } catch (err) {
      this.catatGalat('tulis', err);
    }
  }

  private catatGalat(fase: 'baca' | 'tulis', err: unknown): void {
    const sekarang = Date.now();
    if (sekarang - this.galatTerakhir < JEDA_LOG_MS) {
      return;
    }
    this.galatTerakhir = sekarang;
    this.logger.warn(
      `Redis singgahan tak terjangkau saat ${fase}; jawaban dihitung dari basis data: ${String(err)}`,
    );
  }
}
