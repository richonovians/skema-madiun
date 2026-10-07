import { periksaPenyimpanan } from './gerbang-penyimpanan';

describe('periksaPenyimpanan', () => {
  it('produksi tanpa pernyataan menolak boot', () => {
    expect(() => periksaPenyimpanan('production', undefined)).toThrow(/DB_STORAGE_ENCRYPTED/);
  });

  it('produksi dengan pernyataan "false" menolak boot', () => {
    expect(() => periksaPenyimpanan('production', 'false')).toThrow(/DB_STORAGE_ENCRYPTED/);
  });

  it('produksi dengan nilai yang bukan true/false tetap menolak', () => {
    expect(() => periksaPenyimpanan('production', 'mungkin')).toThrow(/DB_STORAGE_ENCRYPTED/);
    expect(() => periksaPenyimpanan('production', '')).toThrow(/DB_STORAGE_ENCRYPTED/);
  });

  it('produksi dengan pernyataan "true" lolos', () => {
    expect(() => periksaPenyimpanan('production', 'true')).not.toThrow();
    expect(() => periksaPenyimpanan('production', 'TRUE')).not.toThrow();
  });

  it('di luar produksi tak pernah menghalangi', () => {
    expect(() => periksaPenyimpanan('development', undefined)).not.toThrow();
    expect(() => periksaPenyimpanan('test', undefined)).not.toThrow();
    expect(() => periksaPenyimpanan('development', 'false')).not.toThrow();
  });

  it('pesan galatnya menyebut bahwa ini PERNYATAAN, bukan verifikasi', () => {
    expect(() => periksaPenyimpanan('production', undefined)).toThrow(/pernyataan/i);
  });

  it('pesan galatnya menunjuk dokumen prosedurnya', () => {
    expect(() => periksaPenyimpanan('production', undefined)).toThrow(/enkripsi-at-rest\.md/);
  });
});

import { periksaPenyimpanSesi } from './gerbang-penyimpanan';

/**
 * Gerbang Redis (7 Oktober 2026).
 *
 * Pemeriksaan sesi GAGAL TERTUTUP, dan penyimpan dalam memori tidak dibagi
 * antarproses. Di produksi, dua pekerja API berarti sesi yang diterbitkan satu
 * pekerja ditolak pekerja lainnya -- aplikasi yang melempar pemakainya keluar
 * secara acak. Ditolak saat boot supaya kegagalannya terjadi pada penggelaran,
 * bukan sebagai keluhan pengguna beberapa jam kemudian.
 */
describe('periksaPenyimpanSesi', () => {
  it('produksi tanpa REDIS_URL -> menolak menyala', () => {
    expect(() => periksaPenyimpanSesi('production', undefined)).toThrow(/REDIS_URL/);
  });

  it('produksi dengan REDIS_URL -> lolos', () => {
    expect(() => periksaPenyimpanSesi('production', 'redis://127.0.0.1:6379')).not.toThrow();
  });

  it('di luar produksi, kosong pun lolos', () => {
    // Pengembangan memang boleh memakai penyimpan dalam memori; modulnya sudah
    // memperingatkan lewat log saat itu terjadi.
    expect(() => periksaPenyimpanSesi('development', undefined)).not.toThrow();
  });
});
