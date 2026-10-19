import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { PenyimpanCabutLampiran } from './penyimpan-cabut-lampiran.interface';

/** Dipisahkan dari `sesi:`, `laju:`, dan `singgahan:` di keyspace yang sama. */
const AWALAN = 'lampiran-cabut:';

/**
 * `PenyimpanCabutLampiran` di atas Redis.
 *
 * TANPA SINGGAHAN DALAM PROSES, sengaja berbeda dari `PenyimpanSesiRedis` yang
 * menyinggahkan lima detik. Di sana singgahan dibenarkan karena pemeriksaan
 * sesi terjadi pada SETIAP permintaan dan kedip jaringan sepersekian detik akan
 * melempar keluar pengguna yang tak bersalah. Di sini pemeriksaannya hanya
 * terjadi saat lampiran dibuka, jauh lebih jarang, sehingga harga singgahan
 * (tautan yang dicabut masih dapat dibuka beberapa detik) tak sepadan dengan
 * yang dibelinya.
 *
 * `setiap` TIDAK dipakai untuk memperpanjang kunci yang sudah ada: `set` dengan
 * `EX` menyetel ulang TTL-nya, dan itu memang yang diinginkan sebab pencabutan
 * terbaru harus hidup selama umur tautan terpanjang terhitung dari saat itu.
 */
@Injectable()
export class PenyimpanCabutLampiranRedis implements PenyimpanCabutLampiran, OnModuleDestroy {
  constructor(
    private readonly redis: Redis,
    private readonly ttlDetik: number,
  ) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  async cabut(uid: number, padaDetik: number): Promise<void> {
    await this.redis.set(AWALAN + uid, String(padaDetik), 'EX', this.ttlDetik);
  }

  async dicabutPada(uid: number): Promise<number | null> {
    // Lemparan TIDAK ditangkap: pemanggilnya yang memutuskan, dan keputusan itu
    // menolak. Menelannya di sini membuat Redis mati terbaca sebagai "tak
    // pernah dicabut", yang persis kebalikan dari yang benar.
    const nilai = await this.redis.get(AWALAN + uid);
    if (nilai === null) {
      return null;
    }
    const detik = Number(nilai);
    return Number.isInteger(detik) ? detik : null;
  }
}
