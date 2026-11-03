import { trenBulanan } from './tren-bulanan.util';

/**
 * Tren jumlah pengaduan per BULAN untuk halaman statistik publik
 * (2 November 2026). Halaman itu menyaring Bulanan / Tahunan; tahunan
 * dijumlahkan di frontend dari deret ini, jadi deretnya harus utuh sejak
 * pengaduan pertama, bukan cuma dua belas bulan terakhir.
 */
describe('trenBulanan', () => {
  const sekarang = new Date(2026, 10, 2); // 2 November 2026

  it('menghitung jumlah per bulan dengan format "YYYY-MM"', () => {
    const hasil = trenBulanan(
      [new Date(2026, 9, 1), new Date(2026, 9, 31), new Date(2026, 10, 1)],
      sekarang,
    );

    expect(hasil).toEqual([
      { periode: '2026-10', value: 2 },
      { periode: '2026-11', value: 1 },
    ]);
  });

  it('bulan tanpa pengaduan diisi 0, bukan dilewati', () => {
    const hasil = trenBulanan([new Date(2026, 6, 15), new Date(2026, 9, 3)], sekarang);

    expect(hasil).toEqual([
      { periode: '2026-07', value: 1 },
      { periode: '2026-08', value: 0 },
      { periode: '2026-09', value: 0 },
      { periode: '2026-10', value: 1 },
      { periode: '2026-11', value: 0 },
    ]);
  });

  it('deretnya utuh sejak pengaduan pertama, melintasi pergantian tahun', () => {
    const hasil = trenBulanan([new Date(2025, 10, 20)], new Date(2026, 1, 5));

    expect(hasil.map((p) => p.periode)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(hasil.map((p) => p.value)).toEqual([1, 0, 0, 0]);
  });

  it('urutan masukan tidak berpengaruh', () => {
    const hasil = trenBulanan([new Date(2026, 10, 1), new Date(2026, 8, 1)], sekarang);

    expect(hasil.map((p) => p.periode)).toEqual(['2026-09', '2026-10', '2026-11']);
  });

  it('tanpa pengaduan sama sekali mengembalikan deret kosong', () => {
    expect(trenBulanan([], sekarang)).toEqual([]);
  });
});
