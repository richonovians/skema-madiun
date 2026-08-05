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

  it('mengembalikan daftar kategori pengaduan', () => {
    const categories = service.getComplaintCategories();

    expect(categories.length).toBeGreaterThan(0);
    expect(categories[0]).toEqual(
      expect.objectContaining({ kode: expect.any(String), nama: expect.any(String) }),
    );
  });

  it('mengembalikan 18 sub-kategori pengaduan tanpa filter', () => {
    const subCategories = service.getComplaintSubCategories();

    expect(subCategories).toHaveLength(18);
    expect(subCategories[0]).toEqual(
      expect.objectContaining({
        kode: expect.any(String),
        nama: expect.any(String),
        kategoriKode: expect.any(String),
      }),
    );
  });

  it('memfilter sub-kategori berdasarkan kategoriKode', () => {
    const subCategories = service.getComplaintSubCategories('kesehatan');

    expect(subCategories.length).toBeGreaterThan(0);
    expect(subCategories.every((s) => s.kategoriKode === 'kesehatan')).toBe(true);
  });

  it('kategori tak dikenal -> daftar kosong (bukan error)', () => {
    expect(service.getComplaintSubCategories('tidak-ada')).toEqual([]);
  });
});
