import { ReferenceService } from './reference.service';

describe('ReferenceService', () => {
  const service = new ReferenceService();

  it('mengembalikan 9 unsur U1..U9 secara berurutan', () => {
    const unsur = service.getUnsur();

    expect(unsur).toHaveLength(9);
    expect(unsur[0]).toEqual({ kode: 'U1', teks: 'Persyaratan' });
    expect(unsur.map((u) => u.kode)).toEqual([
      'U1',
      'U2',
      'U3',
      'U4',
      'U5',
      'U6',
      'U7',
      'U8',
      'U9',
    ]);
  });

  it('mengembalikan tepat tiga kategori umum, berurutan', () => {
    const categories = service.getComplaintCategories();

    expect(categories.map((c) => c.kode)).toEqual(['aduan', 'lapor', 'lainnya']);
    expect(categories.map((c) => c.nama)).toEqual(['Aduan', 'Lapor', 'Lainnya']);
  });

  it('tak lagi menyediakan sub-kategori (D12/INT-42 dibatalkan)', () => {
    expect(
      (service as unknown as Record<string, unknown>).getComplaintSubCategories,
    ).toBeUndefined();
  });
});
