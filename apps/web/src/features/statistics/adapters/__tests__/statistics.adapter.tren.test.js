import { adaptStatistics } from '../statistics.adapter';

/**
 * TREN JUMLAH PENGADUAN BULANAN / TAHUNAN dan JUMLAH PENGADUAN SELESAI
 * (2 November 2026, halaman statistik publik).
 *
 * Backend mengirim satu deret bulanan yang utuh sejak pengaduan pertama
 * (`complaintTrendBulanan`, bulan kosong bernilai 0). Dari satu deret itu
 * adapter membuat dua tampilan: dua belas bulan terakhir, dan jumlah per
 * tahun. Satu sumber, supaya angka bulanan dan tahunan tak pernah berselisih.
 */
const mentah = (over = {}) => ({
  summary: {},
  ikmTrend: [],
  complaintCategories: [],
  complaintStatus: [],
  serviceElements: [],
  valueDistribution: [],
  topOpd: [],
  ...over,
});

/** 14 bulan berturut-turut, Okt 2025 s.d. Nov 2026, nilai 1..14. */
const empatBelasBulan = Array.from({ length: 14 }, (_, i) => {
  const tahun = 2025 + Math.floor((9 + i) / 12);
  const bulan = ((9 + i) % 12) + 1;
  return { periode: `${tahun}-${String(bulan).padStart(2, '0')}`, value: i + 1 };
});

describe('adaptStatistics — tren pengaduan', () => {
  it('tampilan bulanan memuat dua belas bulan terakhir saja', () => {
    const { complaintTrendBulanan } = adaptStatistics(
      mentah({ complaintTrendBulanan: empatBelasBulan }),
    );

    expect(complaintTrendBulanan).toHaveLength(12);
    expect(complaintTrendBulanan[0]).toEqual({ month: 'Des 2025', value: 3 });
    expect(complaintTrendBulanan[11]).toEqual({ month: 'Nov 2026', value: 14 });
  });

  it('label bulan memakai singkatan bahasa Indonesia', () => {
    const { complaintTrendBulanan } = adaptStatistics(
      mentah({ complaintTrendBulanan: empatBelasBulan }),
    );

    expect(complaintTrendBulanan.map((p) => p.month.split(' ')[0])).toEqual([
      'Des', 'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov',
    ]);
  });

  it('tampilan tahunan menjumlahkan SELURUH deret bulanan, bukan hanya dua belas bulan', () => {
    const { complaintTrendTahunan } = adaptStatistics(
      mentah({ complaintTrendBulanan: empatBelasBulan }),
    );

    // 2025: Okt-Des = 1+2+3; 2026: Jan-Nov = 4+...+14
    expect(complaintTrendTahunan).toEqual([
      { month: '2025', value: 6 },
      { month: '2026', value: 99 },
    ]);
  });

  it('tanpa deret bulanan, kedua tampilan kosong', () => {
    const hasil = adaptStatistics(mentah());

    expect(hasil.complaintTrendBulanan).toEqual([]);
    expect(hasil.complaintTrendTahunan).toEqual([]);
  });
});

describe('adaptStatistics — pengaduan selesai', () => {
  it('diambil dari jumlah status selesai', () => {
    const hasil = adaptStatistics(
      mentah({
        complaintStatus: [
          { status: 'diterima', count: 2 },
          { status: 'selesai', count: 3 },
        ],
      }),
    );

    expect(hasil.completedComplaints).toBe(3);
  });

  /**
   * `groupBy` di backend tak menghasilkan baris untuk status yang jumlahnya
   * nol, jadi "tak ada baris selesai" berarti nol pengaduan selesai -- itu
   * terukur, bukan karangan.
   */
  it('nol bila tak ada baris status selesai', () => {
    const hasil = adaptStatistics(mentah({ complaintStatus: [{ status: 'diterima', count: 4 }] }));

    expect(hasil.completedComplaints).toBe(0);
  });
});
