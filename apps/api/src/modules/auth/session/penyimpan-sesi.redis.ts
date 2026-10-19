import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import type { CatatanSesi, PenyimpanSesi, SesiTerdaftar } from './penyimpan-sesi.interface';

const AWALAN_SESI = 'sesi:';
const AWALAN_AKUN = 'sesi-pengguna:';

/**
 * Singgahan hasil "sid ini hidup" di dalam proses, dalam DETIK.
 *
 * BUKAN demi kecepatan, melainkan supaya kedip jaringan sepersekian detik tidak
 * memutus permintaan yang sedang berjalan: pemeriksaannya gagal tertutup, jadi
 * satu kegagalan sesaat berarti 401 bagi pengguna yang tak melakukan kesalahan
 * apa pun.
 *
 * Harganya tersurat: sesi yang dicabut masih dapat dipakai selama paling lama
 * sekian detik ini. Lima detik dipilih supaya jendela itu lebih pendek daripada
 * waktu seorang admin menyadari ia salah menekan tombol, dan tidak disetel
 * lewat env agar tak ada yang diam-diam menaikkannya menjadi satu jam.
 */
const SINGGAHAN_DETIK = 5;

/**
 * `PenyimpanSesi` di atas Redis.
 *
 * BENTUK KUNCI:
 *  - `sesi:<sid>` berisi catatan sesinya, dengan TTL sampai pagu `abs`.
 *  - `sesi-pengguna:<uid>` berupa SET berisi sid milik akun itu.
 *
 * SET indeksnya ada supaya "keluarkan semua perangkat" dan daftar perangkat
 * tidak perlu `KEYS` maupun `SCAN`. Keduanya menyapu SELURUH keyspace, jadi
 * biayanya tumbuh mengikuti jumlah kunci milik seluruh aplikasi, bukan milik
 * satu akun. Anggota SET tak punya TTL sendiri, karena itu anggota yang
 * kuncinya sudah hilang dipangkas saat dibaca.
 *
 * PERSISTENSI AOF WAJIB menyala di sisi Redis. Pemeriksaannya gagal tertutup,
 * sehingga Redis yang restart dengan keadaan kosong akan mengeluarkan SEMUA
 * orang sekaligus. Lihat docker-compose.yml.
 */
@Injectable()
export class PenyimpanSesiRedis implements PenyimpanSesi, OnModuleDestroy {
  private readonly logger = new Logger(PenyimpanSesiRedis.name);
  private readonly singgahan = new Map<string, number>();

  constructor(private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  private static get sekarang(): number {
    return Math.floor(Date.now() / 1000);
  }

  async simpan(sid: string, catatan: CatatanSesi): Promise<void> {
    const sisa = catatan.abs - PenyimpanSesiRedis.sekarang;
    if (sisa <= 0) return;

    const kunciSesi = AWALAN_SESI + sid;
    const kunciAkun = AWALAN_AKUN + catatan.uid;
    await this.redis
      .multi()
      .hset(kunciSesi, {
        uid: String(catatan.uid),
        abs: String(catatan.abs),
        ua: catatan.ua ?? '',
        ip: catatan.ip ?? '',
      })
      .expire(kunciSesi, sisa)
      .sadd(kunciAkun, sid)
      // Indeksnya hidup setidaknya selama anggota terlamanya. `expire` di sini
      // hanya MEMAJUKAN batas, tak pernah memundurkannya, sebab setiap sesi
      // baru menyetelnya ulang dari nol.
      .expire(kunciAkun, sisa)
      .exec();
  }

  async hidup(sid: string): Promise<boolean> {
    const sampai = this.singgahan.get(sid);
    if (sampai !== undefined && sampai > PenyimpanSesiRedis.sekarang) {
      return true;
    }
    // Lemparan TIDAK ditangkap di sini. Pemanggilnya yang memutuskan, dan
    // keputusan itu menolak sesinya. Menelannya di sini berarti Redis mati
    // terbaca sebagai "sesi tak dikenal" dan tak dapat dibedakan di log.
    const ada = await this.redis.exists(AWALAN_SESI + sid);
    if (ada === 1) {
      this.singgahan.set(sid, PenyimpanSesiRedis.sekarang + SINGGAHAN_DETIK);
      return true;
    }
    this.singgahan.delete(sid);
    return false;
  }

  async cabut(sid: string): Promise<void> {
    const uid = await this.redis.hget(AWALAN_SESI + sid, 'uid');
    const pipa = this.redis.multi().del(AWALAN_SESI + sid);
    if (uid) pipa.srem(AWALAN_AKUN + uid, sid);
    await pipa.exec();
    // Dibuang dari singgahan SETELAH Redis, bukan sebelum: urutan sebaliknya
    // membuka celah sepersekian detik ketika permintaan lain mengisi ulang
    // singgahan dari kunci yang belum sempat terhapus.
    this.singgahan.delete(sid);
  }

  async cabutSemua(uid: number): Promise<void> {
    const kunciAkun = AWALAN_AKUN + uid;
    const daftarSid = await this.redis.smembers(kunciAkun);
    const pipa = this.redis.multi();
    for (const sid of daftarSid) {
      pipa.del(AWALAN_SESI + sid);
    }
    pipa.del(kunciAkun);
    await pipa.exec();
    for (const sid of daftarSid) {
      this.singgahan.delete(sid);
    }
  }

  async daftar(uid: number): Promise<SesiTerdaftar[]> {
    const kunciAkun = AWALAN_AKUN + uid;
    const daftarSid = await this.redis.smembers(kunciAkun);
    if (daftarSid.length === 0) return [];

    const pipa = this.redis.multi();
    for (const sid of daftarSid) {
      pipa.hgetall(AWALAN_SESI + sid);
    }
    const hasil = (await pipa.exec()) ?? [];

    const terdaftar: SesiTerdaftar[] = [];
    const basi: string[] = [];
    daftarSid.forEach((sid, i) => {
      const baris = hasil[i]?.[1] as Record<string, string> | undefined;
      if (!baris || !baris.abs) {
        basi.push(sid);
        return;
      }
      terdaftar.push({
        sid,
        uid,
        abs: Number(baris.abs),
        ...(baris.ua ? { ua: baris.ua } : {}),
        ...(baris.ip ? { ip: baris.ip } : {}),
      });
    });

    if (basi.length > 0) {
      // Anggota SET tak ikut kedaluwarsa bersama kuncinya. Tanpa pemangkasan
      // ini daftar perangkat menampilkan sesi yang sudah mati.
      await this.redis.srem(kunciAkun, ...basi);
    }
    return terdaftar;
  }
}
