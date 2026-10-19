import { KlienSapu, sapuAwalan } from './sapu-singgahan';

/**
 * Redis tiruan seukuran yang dibutuhkan: satu kumpulan kunci, `SCAN` yang
 * menghormati `MATCH` berpola awalan, dan `UNLINK` yang mencatat apa yang
 * benar-benar diminta hapus. Cukup untuk menguji perilaku yang penting di sini
 * -- kunci MANA yang terhapus -- tanpa menuntut Redis hidup.
 */
function redisTiruan(kunci: string[], perBatch = 2): KlienSapu & { sisa: () => string[] } {
  const simpanan = new Set(kunci);
  // CUPLIKAN DIAMBIL SEKALI pada kursor '0', lalu dihalamani. Versi pertama
  // tiruan ini memakai kursor sebagai indeks ke daftar yang DISARING ULANG tiap
  // putaran, sehingga kunci yang baru terhapus menggeser indeksnya dan tiruannya
  // melewatkan kunci yang nyata -- cacat di tiruannya, bukan di yang diuji.
  // Redis sungguhan menjamin setiap kunci yang hadir sepanjang iterasi
  // dikembalikan sedikitnya sekali, walau ada penghapusan di tengah jalan.
  let cuplikan: string[] = [];
  return {
    // Dua argumen terakhir (`COUNT`, jumlah) sengaja tak diterima: fungsi
    // berparameter lebih sedikit tetap sesuai dengan antarmukanya.
    scan: (kursor, _penandaCocok, pencocok) => {
      if (!pencocok.endsWith('*')) {
        throw new Error(`Tiruan ini hanya mengerti pola berawalan, bukan '${pencocok}'`);
      }
      const awalan = pencocok.slice(0, -1);
      const mulai = Number(kursor);
      if (mulai === 0) {
        cuplikan = [...simpanan].filter((k) => k.startsWith(awalan));
      }
      const potongan = cuplikan.slice(mulai, mulai + perBatch);
      const berikut = mulai + perBatch >= cuplikan.length ? '0' : String(mulai + perBatch);
      return Promise.resolve([berikut, potongan]);
    },
    unlink: (...k: string[]) => {
      let n = 0;
      for (const satu of k) {
        if (simpanan.delete(satu)) {
          n += 1;
        }
      }
      return Promise.resolve(n);
    },
    sisa: () => [...simpanan].sort(),
  };
}

describe('sapuAwalan', () => {
  /**
   * INI CACAT YANG SUNGGUHAN TERJADI, 13 Oktober 2026. Versi pertama mode dingin
   * memakai `FLUSHDB`, yang mengosongkan SELURUH basis data logis 1 -- termasuk
   * kunci `sesi:` milik Bearer token yang baru diterbitkan pelari itu sendiri.
   * Akibatnya `GET /api/v1/dashboard/ikm` menjawab 401 dan bebannya tak pernah
   * jalan. Docblock `PenyimpanSinggahanRedis` sudah menyatakannya tersurat:
   * awalan `singgahan:` memang dipisah dari `sesi:` dan `laju:` DI KEYSPACE YANG
   * SAMA.
   */
  it('menghapus hanya kunci berawalan, dan meninggalkan sesi serta batas laju', async () => {
    const redis = redisTiruan([
      'singgahan:statistik-publik',
      'singgahan:ikm-dashboard:g1::',
      'sesi:abc',
      'sesi-pengguna:7',
      'laju:127.0.0.1',
    ]);

    const dihapus = await sapuAwalan(redis, 'singgahan:');

    expect(dihapus).toBe(2);
    expect(redis.sisa()).toEqual(['laju:127.0.0.1', 'sesi-pengguna:7', 'sesi:abc']);
  });

  it('mengikuti kursor sampai habis, bukan hanya batch pertama', async () => {
    const banyak = Array.from({ length: 7 }, (_, i) => `singgahan:k${i}`);
    const redis = redisTiruan([...banyak, 'sesi:abc'], 2);

    const dihapus = await sapuAwalan(redis, 'singgahan:');

    expect(dihapus).toBe(7);
    expect(redis.sisa()).toEqual(['sesi:abc']);
  });

  it('tanpa kunci yang cocok, tak memanggil unlink sama sekali', async () => {
    const redis = redisTiruan(['sesi:abc']);
    const unlink = jest.spyOn(redis, 'unlink');

    await expect(sapuAwalan(redis, 'singgahan:')).resolves.toBe(0);
    expect(unlink).not.toHaveBeenCalled();
  });

  /**
   * Awalan kosong menjadi pola `*`, yang menyapu seluruh basis data logis dan
   * mengembalikan cacat yang baru saja diperbaiki -- lewat jalan yang lebih
   * sunyi, karena ia tak lagi memakai nama `FLUSHDB`.
   */
  it('MENOLAK awalan kosong', async () => {
    await expect(sapuAwalan(redisTiruan([]), '')).rejects.toThrow(/awalan/i);
  });
});
