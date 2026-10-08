import { JENIS_SURVEI, labelJenis } from '../jenisSurvei';

/**
 * Label JENIS survei, satu tempat (8 Oktober 2026): dipakai kolom "Jenis Survei"
 * di tabel Admin Kabupaten dan penyaring jenis di Statistik & Laporan.
 */
describe('jenisSurvei', () => {
  it('memuat dua jenis dengan nilai enum backend apa adanya', () => {
    expect(JENIS_SURVEI.map((j) => j.nilai)).toEqual(['skm_permenpanrb', 'custom']);
  });

  it('labelJenis menerjemahkan nilai dikenal', () => {
    expect(labelJenis('skm_permenpanrb')).toBe('SKM');
    expect(labelJenis('custom')).toBe('Custom');
  });

  it.each([undefined, null, '', 'umum', 'lainnya'])('labelJenis(%p) -> null, tidak mengarang', (nilai) => {
    expect(labelJenis(nilai)).toBeNull();
  });
});
