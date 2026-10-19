import type Redis from 'ioredis';
import { PenyimpanCabutLampiranRedis } from './penyimpan-cabut-lampiran.redis';

/**
 * Uji ini ditulis SESUDAH implementasinya, dan itu pelanggaran TDD yang saya
 * lakukan sendiri (9 Oktober 2026). Dicatat apa adanya karena akibatnya nyata:
 * tanpa uji, `onModuleDestroy` terlewat sama sekali -- ketiga penyimpan Redis
 * lain memanggil `quit()`, yang ini tidak, dan e2e menutupnya dengan
 * "Jest did not exit one second after the test run has completed".
 *
 * TTL tak diturunkan dari jam dinding: ia umur tautan bertanda tangan
 * terpanjang (`upload.signedUrlTtlSeconds`), disuntikkan oleh modulnya.
 */
describe('PenyimpanCabutLampiranRedis', () => {
  const TTL = 3600;
  const buatRedis = (over: Partial<Record<'get' | 'set' | 'quit', jest.Mock>> = {}) =>
    ({
      get: over.get ?? jest.fn().mockResolvedValue(null),
      set: over.set ?? jest.fn().mockResolvedValue('OK'),
      quit: over.quit ?? jest.fn().mockResolvedValue('OK'),
    }) as unknown as Redis & { get: jest.Mock; set: jest.Mock; quit: jest.Mock };

  it('cabut menulis cap waktu berawalan lampiran-cabut: dengan TTL umur tautan', async () => {
    const set = jest.fn().mockResolvedValue('OK');
    const penyimpan = new PenyimpanCabutLampiranRedis(buatRedis({ set }), TTL);

    await penyimpan.cabut(51, 1_791_515_000);

    expect(set).toHaveBeenCalledWith('lampiran-cabut:51', '1791515000', 'EX', TTL);
  });

  it('dicabutPada mengurai cap waktu tersimpan menjadi angka', async () => {
    const redis = buatRedis({ get: jest.fn().mockResolvedValue('1791515000') });
    const penyimpan = new PenyimpanCabutLampiranRedis(redis, TTL);

    await expect(penyimpan.dicabutPada(51)).resolves.toBe(1_791_515_000);
    expect(redis.get).toHaveBeenCalledWith('lampiran-cabut:51');
  });

  it('belum pernah dicabut -> null', async () => {
    const penyimpan = new PenyimpanCabutLampiranRedis(buatRedis(), TTL);

    await expect(penyimpan.dicabutPada(51)).resolves.toBeNull();
  });

  it('isi kunci rusak -> null, bukan NaN yang lolos ke pembanding', async () => {
    const penyimpan = new PenyimpanCabutLampiranRedis(
      buatRedis({ get: jest.fn().mockResolvedValue('besok') }),
      TTL,
    );

    await expect(penyimpan.dicabutPada(51)).resolves.toBeNull();
  });

  /**
   * GAGAL TERTUTUP, kebalikan dari `PenyimpanSinggahan`. Galat HARUS naik ke
   * pemanggil: menelannya di sini membuat Redis mati terbaca sebagai "tak
   * pernah dicabut", dan daftar pencabutan yang dapat dilumpuhkan dengan
   * mematikan Redis bukan daftar pencabutan.
   */
  it('Redis galat saat membaca -> MELEMPAR, tidak diterjemahkan jadi null', async () => {
    const penyimpan = new PenyimpanCabutLampiranRedis(
      buatRedis({ get: jest.fn().mockRejectedValue(new Error('redis tumbang')) }),
      TTL,
    );

    await expect(penyimpan.dicabutPada(51)).rejects.toThrow('redis tumbang');
  });

  it('onModuleDestroy menutup koneksinya, seperti ketiga penyimpan Redis lain', async () => {
    const quit = jest.fn().mockResolvedValue('OK');
    const penyimpan = new PenyimpanCabutLampiranRedis(buatRedis({ quit }), TTL);

    await penyimpan.onModuleDestroy();

    expect(quit).toHaveBeenCalledTimes(1);
  });
});
