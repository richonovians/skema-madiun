import { susunCsv } from '../unduh';

/**
 * Penyusun CSV dipisahkan dari pengunduhnya supaya dapat diuji tanpa DOM.
 * Sebelumnya fungsi `downloadBlob` yang sama disalin di dua halaman monitoring
 * dan sekali lagi di KabDashboardHeader.
 */
describe('susunCsv', () => {
  it('menyusun baris kepala lalu isinya', () => {
    const csv = susunCsv(['Judul', 'Status'], [['Survei A', 'Aktif']]);

    expect(csv).toBe('"Judul","Status"\n"Survei A","Aktif"');
  });

  it('melindungi koma di dalam nilai, supaya kolomnya tidak pecah', () => {
    const csv = susunCsv(['Judul'], [['Survei A, versi revisi']]);

    expect(csv).toContain('"Survei A, versi revisi"');
  });

  it('menggandakan tanda kutip di dalam nilai', () => {
    expect(susunCsv(['Judul'], [['Survei "Percontohan"']])).toContain(
      '"Survei ""Percontohan"""',
    );
  });

  it('nilai kosong ditulis sebagai sel kosong, bukan kata undefined', () => {
    expect(susunCsv(['Pelapor'], [[null]])).toBe('"Pelapor"\n""');
  });
});
