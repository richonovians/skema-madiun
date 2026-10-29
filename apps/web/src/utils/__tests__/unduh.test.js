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

  /**
   * Injeksi rumus (BUG-049, 28 Oktober 2026). Tombol ekspor berlabel "Excel"
   * mengunduh CSV, dan Excel MENGHITUNG sel berawalan `=`, `+`, `-`, `@`
   * walau berkutip -- terukur lewat Excel di mesin pengembang: `"=1+1"`
   * menjadi rumus bernilai 2. Teks itu dapat diketik warga (judul pengaduan,
   * pesan, nama profil) dan Admin OPD (judul survei), lalu terbuka di mesin
   * admin yang mengunduhnya.
   */
  describe('menetralkan sel yang akan dibaca spreadsheet sebagai rumus', () => {
    it.each(['=1+1', '+2+3', '-2+3', '@SUM(1+1)', '\t=1+1', '\r=1+1'])(
      '%j diberi awalan petik tunggal',
      (isi) => {
        expect(susunCsv(['Pesan'], [[isi]])).toBe(`"Pesan"\n"'${isi}"`);
      },
    );

    it.each(['-', '-5', '+5', '-12,5', '85%', 'Survei -A'])('%j dibiarkan apa adanya', (isi) => {
      expect(susunCsv(['Pesan'], [[isi]])).toBe(`"Pesan"\n"${isi}"`);
    });

    it('angka negatif dibiarkan', () => {
      expect(susunCsv(['Nilai'], [[-3]])).toBe('"Nilai"\n"-3"');
    });

    it('penetralan terjadi SEBELUM kutip digandakan', () => {
      expect(susunCsv(['Pesan'], [['=HYPERLINK("x")']])).toContain(`"'=HYPERLINK(""x"")"`);
    });
  });
});
