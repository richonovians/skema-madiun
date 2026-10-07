import type Redis from 'ioredis';
import { PenyimpanSinggahanRedis } from './penyimpan-singgahan.redis';

/**
 * Pembungkus TypeScript atas perintah Redis -- memalsukan klien ioredis.
 * Yang diuji: awalan kunci, JSON bolak-balik, dan GAGAL-TERBUKA (baca galat ->
 * meleset, tulis galat -> ditelan).
 */
describe('PenyimpanSinggahanRedis', () => {
  const buatRedis = (over: Partial<Record<'get' | 'set', jest.Mock>> = {}) =>
    ({
      get: over.get ?? jest.fn().mockResolvedValue(null),
      set: over.set ?? jest.fn().mockResolvedValue('OK'),
      quit: jest.fn(),
    }) as unknown as Redis & { get: jest.Mock; set: jest.Mock };

  it('ambil mengurai JSON dari kunci berawalan singgahan:', async () => {
    const redis = buatRedis({ get: jest.fn().mockResolvedValue('{"a":1}') });
    const penyimpan = new PenyimpanSinggahanRedis(redis);

    const nilai = await penyimpan.ambil<{ a: number }>('statistik-publik');

    expect(redis.get).toHaveBeenCalledWith('singgahan:statistik-publik');
    expect(nilai).toEqual({ a: 1 });
  });

  it('ambil pada kunci kosong menghasilkan null (meleset)', async () => {
    const penyimpan = new PenyimpanSinggahanRedis(buatRedis());
    await expect(penyimpan.ambil('x')).resolves.toBeNull();
  });

  it('simpan menulis JSON dengan TTL lewat EX', async () => {
    const set = jest.fn().mockResolvedValue('OK');
    const penyimpan = new PenyimpanSinggahanRedis(buatRedis({ set }));

    await penyimpan.simpan('statistik-publik', { a: 1 }, 60);

    expect(set).toHaveBeenCalledWith('singgahan:statistik-publik', '{"a":1}', 'EX', 60);
  });

  it('GAGAL-TERBUKA saat baca: galat Redis menjadi meleset, bukan lemparan', async () => {
    const redis = buatRedis({ get: jest.fn().mockRejectedValue(new Error('redis tumbang')) });
    const penyimpan = new PenyimpanSinggahanRedis(redis);

    await expect(penyimpan.ambil('x')).resolves.toBeNull();
  });

  it('GAGAL-TERBUKA saat tulis: galat Redis ditelan, tidak melempar', async () => {
    const redis = buatRedis({ set: jest.fn().mockRejectedValue(new Error('redis tumbang')) });
    const penyimpan = new PenyimpanSinggahanRedis(redis);

    await expect(penyimpan.simpan('x', { a: 1 }, 60)).resolves.toBeUndefined();
  });
});
