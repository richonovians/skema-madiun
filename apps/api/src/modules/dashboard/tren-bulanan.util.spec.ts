import { trenBulanan, trenTriwulan } from './tren-bulanan.util';

/**
 * Tren jumlah pengaduan per BULAN untuk halaman statistik publik
 * (2 November 2026). Halaman itu menyaring Bulanan / Tahunan; tahunan
 * dijumlahkan di frontend dari deret ini, jadi deretnya harus utuh sejak
 * pengaduan pertama, bukan cuma dua belas bulan terakhir.
 *
 * Masukannya hitungan per bulan dari Postgres (BUG-068, 13 November 2026),
 * bukan lagi satu tanggal per pengaduan.
 */
describe('trenBulanan', () => {
  const sekarang = new Date(2026, 10, 2); // 2 November 2026

  it('memakai hitungan per bulan apa adanya dengan format "YYYY-MM"', () => {
    const hasil = trenBulanan(
      [
        { bulan: '2026-10', jumlah: 2 },
        { bulan: '2026-11', jumlah: 1 },
      ],
      sekarang,
    );

    expect(hasil).toEqual([
      { periode: '2026-10', value: 2 },
      { periode: '2026-11', value: 1 },
    ]);
  });

  it('bulan tanpa pengaduan diisi 0, bukan dilewati', () => {
    const hasil = trenBulanan(
      [
        { bulan: '2026-07', jumlah: 1 },
        { bulan: '2026-10', jumlah: 1 },
      ],
      sekarang,
    );

    expect(hasil).toEqual([
      { periode: '2026-07', value: 1 },
      { periode: '2026-08', value: 0 },
      { periode: '2026-09', value: 0 },
      { periode: '2026-10', value: 1 },
      { periode: '2026-11', value: 0 },
    ]);
  });

  it('deretnya utuh sejak pengaduan pertama, melintasi pergantian tahun', () => {
    const hasil = trenBulanan([{ bulan: '2025-11', jumlah: 1 }], new Date(2026, 1, 5));

    expect(hasil.map((p) => p.periode)).toEqual(['2025-11', '2025-12', '2026-01', '2026-02']);
    expect(hasil.map((p) => p.value)).toEqual([1, 0, 0, 0]);
  });

  it('urutan masukan tidak berpengaruh', () => {
    const hasil = trenBulanan(
      [
        { bulan: '2026-11', jumlah: 1 },
        { bulan: '2026-09', jumlah: 1 },
      ],
      sekarang,
    );

    expect(hasil.map((p) => p.periode)).toEqual(['2026-09', '2026-10', '2026-11']);
  });

  it('bulan sesudah `sekarang` tetap ikut, deretnya diperpanjang sampai sana', () => {
    const hasil = trenBulanan([{ bulan: '2027-01', jumlah: 3 }], sekarang);

    expect(hasil.map((p) => p.periode)).toEqual(['2027-01']);
    expect(hasil[0].value).toBe(3);
  });

  it('tanpa pengaduan sama sekali mengembalikan deret kosong', () => {
    expect(trenBulanan([], sekarang)).toEqual([]);
  });

  /**
   * BUG-100 (25 November 2026): ujung deret adalah bulan `sekarang` menurut
   * WIB, sama dengan bulan yang dihitung Postgres. Di server UTC, pukul
   * 00.00-06.59 WIB tanggal 1 dulu masih terbaca bulan sebelumnya, sehingga
   * bulan berjalan hilang dari ujung grafik. Merahnya hanya tampak di bawah
   * `TZ=UTC`; pagar zona merah di zona mana pun.
   */
  describe('BUG-100: bulan `sekarang` menurut WIB', () => {
    it('1 November 00.30 WIB (31 Oktober 17.30 UTC) sudah November', () => {
      const hasil = trenBulanan(
        [{ bulan: '2026-10', jumlah: 1 }],
        new Date('2026-10-31T17:30:00.000Z'),
      );

      expect(hasil.map((p) => p.periode)).toEqual(['2026-10', '2026-11']);
    });

    it('1 Januari 2027 03.00 WIB (31 Desember 20.00 UTC) sudah Januari 2027', () => {
      const hasil = trenBulanan(
        [{ bulan: '2026-12', jumlah: 1 }],
        new Date('2026-12-31T20:00:00.000Z'),
      );

      expect(hasil.map((p) => p.periode)).toEqual(['2026-12', '2027-01']);
    });

    it('tak memanggil satu pun metode Date berwaktu lokal', () => {
      const mata = (['getFullYear', 'getMonth', 'getDate', 'getHours'] as const).map(
        (m) => [m, jest.spyOn(Date.prototype, m)] as const,
      );
      try {
        trenBulanan([{ bulan: '2026-10', jumlah: 1 }], new Date('2026-10-31T17:30:00.000Z'));
        const terpanggil = mata.filter(([, s]) => s.mock.calls.length > 0).map(([m]) => m);
        expect(terpanggil).toEqual([]);
      } finally {
        jest.restoreAllMocks();
      }
    });
  });
});

describe('trenTriwulan', () => {
  it('menjumlahkan bulan ke triwulannya, terurut kronologis', () => {
    const hasil = trenTriwulan([
      { bulan: '2026-05', jumlah: 1 },
      { bulan: '2026-01', jumlah: 1 },
      { bulan: '2026-03', jumlah: 2 },
      { bulan: '2025-12', jumlah: 4 },
    ]);

    expect(hasil).toEqual([
      { periode: '2025-Q4', value: 4 },
      { periode: '2026-Q1', value: 3 },
      { periode: '2026-Q2', value: 1 },
    ]);
  });

  it('triwulan tanpa pengaduan TIDAK diisi 0 -- beda dengan deret bulanan', () => {
    const hasil = trenTriwulan([
      { bulan: '2026-01', jumlah: 1 },
      { bulan: '2026-10', jumlah: 1 },
    ]);

    expect(hasil.map((p) => p.periode)).toEqual(['2026-Q1', '2026-Q4']);
  });

  it('tanpa pengaduan mengembalikan deret kosong', () => {
    expect(trenTriwulan([])).toEqual([]);
  });
});
