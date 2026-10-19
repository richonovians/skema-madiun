import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import type { ThrottlerStorage } from '@nestjs/throttler';
import Redis from 'ioredis';

/**
 * Tipe record diturunkan dari kontraknya sendiri. `ThrottlerStorageRecord`
 * tidak ikut diekspor dari index `@nestjs/throttler`, dan menembus ke berkas
 * `dist/` internalnya akan patah pada peningkatan versi mana pun.
 */
type RecordLaju = Awaited<ReturnType<ThrottlerStorage['increment']>>;

/** Awalan kunci penghitung laju. Memisahkannya dari `sesi:` milik PenyimpanSesiRedis. */
const AWALAN = 'laju:';
/** Akhiran kunci penanda blokir, satu per kunci penghitung. */
const AKHIRAN_BLOK = ':blok';

/**
 * Jarak minimum antar-baris galat, milidetik. Saat Redis tumbang, SETIAP
 * permintaan gagal; tanpa gerbang ini satu menit padam menenggelamkan log di
 * ribuan baris yang sama dan menyembunyikan galat lain.
 */
const JEDA_LOG_MS = 10_000;

/**
 * Penghitung atomik: INCR + PEXPIRE sekali di awal jendela, lalu pasang penanda
 * blokir begitu lampaui batas. Satu putaran ke Redis, tak ada baca-lalu-tulis
 * yang bisa berlomba antar-proses -- itulah guna Lua di sini, bukan `multi()`.
 *
 * KELUARAN (empat angka, meniru kontrak ThrottlerStorageService bawaan):
 *   1. totalHits        jumlah ketukan pada jendela berjalan
 *   2. timeToExpire     sisa umur penghitung, DETIK (dibulatkan ke atas)
 *   3. isBlocked        1/0
 *   4. timeToBlockExpire sisa blokir, DETIK (dibulatkan ke atas)
 *
 * SELAGI TERBLOKIR, penghitung TIDAK dinaikkan -- sama dengan `if (!isBlocked)`
 * di implementasi memori bawaan. Menaikkannya terus selama blokir akan
 * memperpanjang jendela penghitung tanpa guna dan mengaburkan totalHits.
 */
const SKRIP = `
local ttl = tonumber(ARGV[1])
local limit = tonumber(ARGV[2])
local blok = tonumber(ARGV[3])
local kunci = KEYS[1]
local kunciBlok = KEYS[2]

local sisaBlok = redis.call('PTTL', kunciBlok)
if sisaBlok > 0 then
  local hits = tonumber(redis.call('GET', kunci)) or (limit + 1)
  local sisa = redis.call('PTTL', kunci)
  local tte = 0
  if sisa > 0 then tte = math.ceil(sisa / 1000) end
  return { hits, tte, 1, math.ceil(sisaBlok / 1000) }
end

local hits = redis.call('INCR', kunci)
if hits == 1 then
  redis.call('PEXPIRE', kunci, ttl)
end
local sisa = redis.call('PTTL', kunci)
if sisa < 0 then
  redis.call('PEXPIRE', kunci, ttl)
  sisa = ttl
end

local terblokir = 0
local ttbe = 0
if hits > limit then
  redis.call('SET', kunciBlok, '1', 'PX', blok)
  terblokir = 1
  ttbe = math.ceil(blok / 1000)
end

return { hits, math.ceil(sisa / 1000), terblokir, ttbe }
`;

/**
 * `ThrottlerStorage` di atas Redis -- penghitung batas laju yang DIBAGI
 * antarproses dan selamat melewati restart (7 Oktober 2026).
 *
 * MENGAPA PERLU. Storage bawaan `@nestjs/throttler` adalah `Map` di dalam
 * proses. Dengan dua pekerja API, satu klien dapat menembus batasnya hanya
 * dengan berpindah pekerja; setiap penggelaran juga mereset seluruh kuota. Yang
 * paling berharga dijaganya adalah anti-banjir jalur publik -- `@BatasPerSurvei`
 * dan batas kirim pengaduan -- yang tanpa ini bocor per-proses di produksi.
 *
 * FAIL-OPEN, DAN INI SENGAJA BERLAWANAN DENGAN PenyimpanSesiRedis. Pemeriksaan
 * sesi gagal TERTUTUP karena sesi tercabut yang tetap dihormati adalah lubang
 * keamanan. Batas laju sebaliknya: bila ia gagal tertutup, satu kedipan Redis
 * menolak SETIAP permintaan dan mengubah gangguan sesaat menjadi padam total --
 * limiter yang menjatuhkan lalu lintas sah bukan pelindung, melainkan senjata
 * yang diarahkan ke diri sendiri. Absennya limiter sesaat hanya MELEMAHKAN
 * pertahanan berlapis (Turnstile dan batas harian di basis data masih berdiri),
 * bukan membuka akses. Karena itu galat Redis di sini DITELAN dan permintaannya
 * diloloskan, kebalikan dari penyimpan sesi yang membiarkan lemparannya naik.
 */
@Injectable()
export class PenyimpanLajuRedis implements ThrottlerStorage, OnModuleDestroy {
  private readonly logger = new Logger(PenyimpanLajuRedis.name);
  private galatTerakhir = 0;

  constructor(private readonly redis: Redis) {}

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  // `throttlerName` (arg kelima kontrak) sengaja tak dideklarasikan: kuncinya
  // sudah memisahkan tiap throttler lewat generateKey, jadi di sini tak dipakai.
  // TypeScript mengizinkan implementasi dengan parameter lebih sedikit.
  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
  ): Promise<RecordLaju> {
    const kunci = AWALAN + key;
    const kunciBlok = kunci + AKHIRAN_BLOK;
    try {
      const hasil = (await this.redis.eval(
        SKRIP,
        2,
        kunci,
        kunciBlok,
        String(ttl),
        String(limit),
        String(blockDuration),
      )) as [number, number, number, number];
      return {
        totalHits: Number(hasil[0]),
        timeToExpire: Number(hasil[1]),
        isBlocked: Number(hasil[2]) === 1,
        timeToBlockExpire: Number(hasil[3]),
      };
    } catch (err) {
      this.catatGalat(err);
      // FAIL-OPEN: permintaan diloloskan apa adanya. totalHits 0 dan tak
      // terblokir -- lihat alasannya di docblock kelas.
      return {
        totalHits: 0,
        timeToExpire: Math.ceil(ttl / 1000),
        isBlocked: false,
        timeToBlockExpire: 0,
      };
    }
  }

  private catatGalat(err: unknown): void {
    const sekarang = Date.now();
    if (sekarang - this.galatTerakhir < JEDA_LOG_MS) {
      return;
    }
    this.galatTerakhir = sekarang;
    this.logger.error(
      `Redis batas laju tak terjangkau; permintaan DILOLOSKAN tanpa dihitung: ${String(err)}`,
    );
  }
}
