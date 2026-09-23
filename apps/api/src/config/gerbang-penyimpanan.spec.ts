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
