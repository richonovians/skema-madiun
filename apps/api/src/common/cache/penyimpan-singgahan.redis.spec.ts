import type Redis from 'ioredis';
import { PenyimpanSinggahanRedis } from './penyimpan-singgahan.redis';

/**
 * Pembungkus TypeScript atas perintah Redis -- memalsukan klien ioredis.
 * Yang diuji: awalan kunci, JSON bolak-balik, dan GAGAL-TERBUKA (baca galat ->
 * meleset, tulis galat -> ditelan).
 */
describe('PenyimpanSinggahanRedis', () => {
  const buatRedis = (over: Partial<Record<'get' | 'set' | 'del', jest.Mock>> = {}) =>
    ({
      get: over.get ?? jest.fn().mockResolvedValue(null),
      set: over.set ?? jest.fn().mockResolvedValue('OK'),
      del: over.del ?? jest.fn().mockResolvedValue(1),
      quit: jest.fn(),
    }) as unknown as Redis & { get: jest.Mock; set: jest.Mock; del: jest.Mock };

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

/**
 * PEMBATALAN SATU KUNCI (9 Oktober 2026).
 *
 * Lahir karena singgahan hitungan IKM terbukti menyajikan angka basi: e2e
 * `ikm.e2e-spec.ts` memanggil `/results` saat survei belum berresponden,
 * menyinggahkan sebaran KOSONG, lalu dua jawaban masuk dan angkanya tetap nol
 * sampai TTL 60 detik lewat. Docblock antarmuka ini sebelumnya menyatakan
 * singgahan ini "tanpa logika invalidasi" dan itu memang pilihan yang sah
 * untuk ringkasan publik -- tetapi `/surveys/:id/results` adalah layar kerja
 * Admin OPD, bukan ringkasan publik.
 */
describe('PenyimpanSinggahanRedis.hapus', () => {
  const buatRedis = (del: jest.Mock) =>
    ({
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
      del,
      quit: jest.fn(),
    }) as unknown as Redis;

  it('menghapus kunci BERAWALAN singgahan:, bukan kunci mentahnya', async () => {
    const del = jest.fn().mockResolvedValue(1);
    const penyimpan = new PenyimpanSinggahanRedis(buatRedis(del));

    await penyimpan.hapus('ikm-sebaran:7');

    expect(del).toHaveBeenCalledWith('singgahan:ikm-sebaran:7');
  });

  /**
   * Tetap GAGAL-TERBUKA, sama seperti `simpan`. Pembatalan terjadi SESUDAH
   * jawaban tersimpan di Postgres, jadi melemparkan galat di sini berarti
   * responden diberi tahu pengisiannya gagal padahal barisnya sudah masuk.
   * Harga kegagalannya hanya angka basi sampai TTL lewat.
   */
  it('GAGAL-TERBUKA: galat Redis ditelan, bukan dilemparkan ke pemanggil', async () => {
    const del = jest.fn().mockRejectedValue(new Error('redis tumbang'));
    const penyimpan = new PenyimpanSinggahanRedis(buatRedis(del));

    await expect(penyimpan.hapus('ikm-rata:7')).resolves.toBeUndefined();
  });
});
