import type Redis from 'ioredis';
import { PenyimpanLajuRedis } from './penyimpan-laju.redis';

/**
 * Pembungkus TypeScript atas skrip Lua -- bukan Lua-nya sendiri, yang hanya
 * dapat diuji terhadap Redis sungguhan (lihat e2e throttle-*). Yang diuji di
 * sini: pemetaan larik keluaran menjadi ThrottlerStorageRecord, penerjemahan
 * flag blokir, argumen yang dikirim, dan -- yang paling penting -- FAIL-OPEN.
 */
describe('PenyimpanLajuRedis', () => {
  const buatRedis = (impl: unknown) =>
    ({ eval: jest.fn().mockImplementation(() => impl), quit: jest.fn() }) as unknown as Redis & {
      eval: jest.Mock;
    };

  it('memetakan larik keluaran Lua menjadi record, detik apa adanya', async () => {
    const redis = buatRedis(Promise.resolve([3, 57, 0, 0]));
    const penyimpan = new PenyimpanLajuRedis(redis);

    const record = await penyimpan.increment('kunci', 60_000, 100, 60_000);

    expect(record).toEqual({
      totalHits: 3,
      timeToExpire: 57,
      isBlocked: false,
      timeToBlockExpire: 0,
    });
  });

  it('flag 1 pada posisi ketiga menjadi isBlocked true', async () => {
    const redis = buatRedis(Promise.resolve([101, 40, 1, 40]));
    const penyimpan = new PenyimpanLajuRedis(redis);

    const record = await penyimpan.increment('kunci', 60_000, 100, 60_000);

    expect(record.isBlocked).toBe(true);
    expect(record.timeToBlockExpire).toBe(40);
  });

  it('memberi dua kunci berawalan dan ttl/limit/blok sebagai string', async () => {
    const redis = buatRedis(Promise.resolve([1, 60, 0, 0]));
    const penyimpan = new PenyimpanLajuRedis(redis);

    await penyimpan.increment('ip:1.2.3.4', 60_000, 100, 30_000);

    const argumen = redis.eval.mock.calls[0];
    // (skrip, jumlahKunci, kunci, kunciBlok, ttl, limit, blok)
    expect(argumen[1]).toBe(2);
    expect(argumen[2]).toBe('laju:ip:1.2.3.4');
    expect(argumen[3]).toBe('laju:ip:1.2.3.4:blok');
    expect(argumen.slice(4)).toEqual(['60000', '100', '30000']);
  });

  it('FAIL-OPEN: galat Redis meloloskan permintaan, bukan menolaknya', async () => {
    const redis = buatRedis(Promise.reject(new Error('redis tumbang')));
    const penyimpan = new PenyimpanLajuRedis(redis);

    // Tidak boleh melempar: lemparan di sini akan menjadi 500 dan,
    // melalui ThrottlerGuard, memadamkan seluruh API saat Redis berkedip.
    const record = await penyimpan.increment('kunci', 60_000, 100, 60_000);

    expect(record.isBlocked).toBe(false);
    expect(record.totalHits).toBe(0);
    expect(record.timeToExpire).toBe(60);
  });
});
