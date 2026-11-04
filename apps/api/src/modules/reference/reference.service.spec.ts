import { TingkatPengaduan } from '@prisma/client';
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

  /**
   * Uji ini sempat berbunyi "mengembalikan tepat tiga kategori umum" dan
   * memaku 'aduan'/'lapor'/'lainnya'. Ketiganya diganti taksonomi per tingkat
   * 4 November 2026 (permintaan pengguna) -- lihat reference.constants.ts.
   */
  it('tanpa kueri: mengembalikan seluruh kategori kedua tingkat', () => {
    const categories = service.getComplaintCategories();

    expect(categories).toHaveLength(29);
    // Kecamatan DULU, lalu kabupaten. Urutannya bagian dari kontrak: dropdown
    // memakainya apa adanya.
    expect(categories[0].kode).toBe('kec_administrasi');
    expect(categories[8].kode).toBe('kab_kependudukan');
    expect(categories.every((c) => typeof c.tingkat === 'string')).toBe(true);
  });

  it('dengan kueri tingkat: hanya kategori tingkat itu', () => {
    const kecamatan = service.getComplaintCategories(TingkatPengaduan.kecamatan);
    const kabupaten = service.getComplaintCategories(TingkatPengaduan.kabupaten);

    expect(kecamatan).toHaveLength(8);
    expect(kabupaten).toHaveLength(21);
    expect(kecamatan.every((c) => c.tingkat === TingkatPengaduan.kecamatan)).toBe(true);
    expect(kabupaten.every((c) => c.tingkat === TingkatPengaduan.kabupaten)).toBe(true);
  });

  it('mempertahankan urutan daftar, dengan "Lainnya" paling akhir', () => {
    // Mengurutkan alfabetis akan menenggelamkan "Lainnya" ke tengah daftar.
    expect(service.getComplaintCategories(TingkatPengaduan.kecamatan).at(-1)?.kode).toBe(
      'kec_lainnya',
    );
    expect(service.getComplaintCategories(TingkatPengaduan.kabupaten).at(-1)?.kode).toBe(
      'kab_lainnya',
    );
  });

  it('tak lagi menyediakan sub-kategori (D12/INT-42 dibatalkan)', () => {
    expect(
      (service as unknown as Record<string, unknown>).getComplaintSubCategories,
    ).toBeUndefined();
  });
});
