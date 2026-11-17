import { adaptStatistics } from '../statistics.adapter';

const MENTAH = {
  summary: { ikm: 82.64 },
  ikmTrend: [],
  complaintCategories: [],
  complaintStatus: [
    { status: 'selesai', count: 333 },
    { status: 'diterima', count: 667 },
  ],
  serviceElements: [],
  valueDistribution: [],
  topOpd: [],
};

describe('adaptStatistics', () => {
  /**
   * Persentase saja TIDAK cukup. Pemakai yang butuh jumlahnya harus menghitung
   * mundur dari persen, dan hasilnya meleset begitu pembulatannya bergeser:
   * 33% dari 1000 memberi 330, sedangkan jumlah sebenarnya 333.
   */
  it('mempertahankan jumlah pengaduan per status, bukan hanya persentasenya', () => {
    const hasil = adaptStatistics(MENTAH);

    const selesai = hasil.complaintStatus.status.find((s) => s.id === 'selesai');
    expect(selesai.count).toBe(333);
    expect(selesai.percentage).toBe(33);
    expect(hasil.complaintStatus.total).toBe(1000);
  });

  /**
   * BUG-085 (18 November 2026). Kedua tingkat punya kategori bernama
   * "Lainnya"; tanpa akhiran tingkat, kartu "Top Kategori Pengaduan"
   * menampilkan dua baris "Lainnya" yang tak dapat dibedakan pembacanya.
   * Akhirannya sama dengan penyaring kategori Admin Kabupaten.
   */
  it('memberi akhiran tingkat pada label kategori', () => {
    const hasil = adaptStatistics({
      ...MENTAH,
      complaintCategories: [
        { kode: 'kab_lainnya', nama: 'Lainnya', tingkat: 'kabupaten', count: 5 },
        { kode: 'kec_lainnya', nama: 'Lainnya', tingkat: 'kecamatan', count: 2 },
        { kode: 'kab_kesehatan', nama: 'Kesehatan', tingkat: 'kabupaten', count: 1 },
      ],
    });

    expect(hasil.complaintCategories).toEqual([
      { category: 'Lainnya (Kab.)', count: 5 },
      { category: 'Lainnya (Kec.)', count: 2 },
      { category: 'Kesehatan (Kab.)', count: 1 },
    ]);
  });

  it('tidak mengarang tingkat bila backend tak mengirimnya', () => {
    const hasil = adaptStatistics({
      ...MENTAH,
      complaintCategories: [{ kode: 'kab_lainnya', nama: 'Lainnya', count: 5 }],
    });

    expect(hasil.complaintCategories).toEqual([{ category: 'Lainnya', count: 5 }]);
  });
});
