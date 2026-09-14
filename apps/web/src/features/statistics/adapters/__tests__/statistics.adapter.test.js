import { adaptStatistics } from '../statistics.adapter';

const MENTAH = {
  summary: { ikm: 82.64 },
  insight: { text: null },
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
});
