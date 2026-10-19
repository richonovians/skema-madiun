import {
  hitungAnalitikPengaduan,
  saringSurveiJenis,
  saringSurveiPeriode,
  titikTrenTahun,
} from '../analitik.adapter';

/**
 * Penyaring Tahun + Triwulan untuk Statistik & Laporan Admin OPD (7 Oktober
 * 2026, permintaan pengguna).
 *
 * Tanggal dibuat dengan konstruktor LOKAL (`new Date(tahun, bulan, ...)`),
 * bukan string ISO: pengaduan dibucket dengan `getMonth()` lokal, jadi
 * "2026-04-01T00:00Z" jatuh ke Maret di mesin berzona waktu barat dan uji ini
 * akan memerah di mesin yang berbeda tanpa ada yang berubah.
 */
const tgl = (tahun, bulan, hari = 15, jam = 12) => new Date(tahun, bulan, hari, jam).toISOString();

/** Pengaduan minimal; `bulan` 0-11. */
const aduan = (status, bulan, over = {}) => ({
  id: `T${Math.random()}`,
  status,
  kategori: 'aduan',
  createdAt: tgl(2026, bulan),
  updatedAt: tgl(2026, bulan),
  ...over,
});

/** Setelah seluruh 2026 berakhir: tak ada bulan yang terpotong sebagai "belum tiba". */
const AKHIR_2026 = new Date(2026, 11, 31);

describe('saringSurveiPeriode', () => {
  const survei = [
    { id: '1', period: '2026-Q1' },
    { id: '2', period: '2026-Q2' },
    { id: '3', period: '2025-Q2' },
  ];

  it('satu triwulan hanya meloloskan triwulan itu pada tahun itu', () => {
    expect(saringSurveiPeriode(survei, '2026-Q2').map((s) => s.id)).toEqual(['2']);
  });

  it('"Semua Triwulan" (tahun saja) meloloskan seluruh triwulan tahun itu', () => {
    // Bentuk `2026` tak pernah sama dengan `2026-Q1`; penyaring yang memakai
    // kesamaan string mengosongkan hasil -- cacat yang pernah menimpa dashboard.
    expect(saringSurveiPeriode(survei, '2026').map((s) => s.id)).toEqual(['1', '2']);
  });

  it('tahun lain tidak ikut walau triwulannya sama', () => {
    expect(saringSurveiPeriode(survei, '2026-Q2').map((s) => s.id)).not.toContain('3');
  });

  it('penyaring kosong meloloskan semuanya', () => {
    expect(saringSurveiPeriode(survei, '')).toHaveLength(3);
  });
});

/**
 * Penyaring JENIS survei (8 Oktober 2026, permintaan pengguna: "tambah filter untuk
 * statistic khusus survei custom dan skm"). Murni, tanpa mengubah masukan.
 */
describe('saringSurveiJenis', () => {
  const survei = [
    { id: '1', jenis: 'skm_permenpanrb' },
    { id: '2', jenis: 'custom' },
    { id: '3', jenis: 'custom' },
    { id: '4' }, // backend lama: tanpa jenis
  ];

  it.each(['semua', undefined, null, ''])('%p meloloskan SEMUANYA, termasuk yang tanpa jenis', (nilai) => {
    expect(saringSurveiJenis(survei, nilai).map((s) => s.id)).toEqual(['1', '2', '3', '4']);
  });

  it('skm_permenpanrb hanya meloloskan SKM', () => {
    expect(saringSurveiJenis(survei, 'skm_permenpanrb').map((s) => s.id)).toEqual(['1']);
  });

  it('custom hanya meloloskan Custom; survei tanpa jenis tidak diperlakukan sebagai Custom', () => {
    expect(saringSurveiJenis(survei, 'custom').map((s) => s.id)).toEqual(['2', '3']);
  });

  it('larik kosong aman, dan masukan tidak diubah', () => {
    expect(saringSurveiJenis([], 'custom')).toEqual([]);
    const salinan = survei.map((s) => ({ ...s }));
    saringSurveiJenis(survei, 'custom');
    expect(survei).toEqual(salinan);
  });
});

describe('titikTrenTahun', () => {
  const titik = [
    { kode: '2025-Q4', periode: 'Triwulan IV - 2025', nilaiIkm: 70 },
    { kode: '2026-Q1', periode: 'Triwulan I - 2026', nilaiIkm: 75 },
    { kode: '2026-Q2', periode: 'Triwulan II - 2026', nilaiIkm: 80 },
  ];

  it('menyisakan titik pada tahun penyaring', () => {
    expect(titikTrenTahun(titik, '2026').map((p) => p.kode)).toEqual(['2026-Q1', '2026-Q2']);
  });

  it('memilih satu triwulan TETAP menampilkan seluruh tahunnya (tren butuh lebih dari satu titik)', () => {
    expect(titikTrenTahun(titik, '2026-Q1').map((p) => p.kode)).toEqual(['2026-Q1', '2026-Q2']);
  });

  it('tahun tanpa data menghasilkan larik kosong', () => {
    expect(titikTrenTahun(titik, '2024')).toEqual([]);
  });

  it('penyaring kosong mengembalikan semua titik', () => {
    expect(titikTrenTahun(titik, '')).toHaveLength(3);
  });
});

describe('hitungAnalitikPengaduan', () => {
  const kategori = [
    { kode: 'aduan', nama: 'Aduan' },
    { kode: 'lapor', nama: 'Laporan' },
  ];
  const hitung = (complaints, periode, extra = {}) =>
    hitungAnalitikPengaduan({
      complaints,
      categories: kategori,
      periode,
      sekarang: AKHIR_2026,
      ...extra,
    });

  describe('penyaringan', () => {
    const data = [
      aduan('Diterima', 0), // Q1
      aduan('Selesai', 1), // Q1
      aduan('Diproses', 4), // Q2
      aduan('Selesai', 10, { createdAt: tgl(2025, 10), updatedAt: tgl(2025, 10) }), // Q4 2025
    ];

    it('satu triwulan hanya menghitung pengaduan yang dibuat pada triwulan itu', () => {
      expect(hitung(data, '2026-Q1').totalComplaints).toBe(2);
      expect(hitung(data, '2026-Q2').totalComplaints).toBe(1);
    });

    it('tahun saja menghitung seluruh triwulan tahun itu, dan tidak menyentuh tahun lain', () => {
      expect(hitung(data, '2026').totalComplaints).toBe(3);
      expect(hitung(data, '2025').totalComplaints).toBe(1);
    });

    it('penyaring kosong menghitung semuanya', () => {
      expect(hitung(data, '').totalComplaints).toBe(4);
    });

    it('periode tanpa pengaduan -> total 0 dan angka resolusi null, bukan 0 karangan', () => {
      const hasil = hitung(data, '2024');

      expect(hasil.totalComplaints).toBe(0);
      expect(hasil.resolutionStats.completionRate).toBeNull();
      expect(hasil.resolutionStats.averageHours).toBeNull();
    });

    it('pengaduan tanpa createdAt tak lolos saat ada penyaring, tetapi tetap masuk bila tidak ada', () => {
      const tanpaTanggal = [aduan('Diterima', 0, { createdAt: null })];

      expect(hitung(tanpaTanggal, '2026-Q1').totalComplaints).toBe(0);
      expect(hitung(tanpaTanggal, '').totalComplaints).toBe(1);
    });
  });

  describe('angka resolusi (cermin DashboardService.getOpdDashboard)', () => {
    it('completionRate = selesai / total * 100, 2 desimal', () => {
      const data = [aduan('Selesai', 0), aduan('Diterima', 0), aduan('Diproses', 0)];

      expect(hitung(data, '2026-Q1').resolutionStats.completionRate).toBe(33.33);
    });

    it('averageHours = rata-rata (updatedAt - createdAt) pengaduan SELESAI saja, 1 desimal', () => {
      const data = [
        aduan('Selesai', 0, { createdAt: tgl(2026, 0, 10, 8), updatedAt: tgl(2026, 0, 10, 10) }), // 2 jam
        aduan('Selesai', 0, { createdAt: tgl(2026, 0, 11, 8), updatedAt: tgl(2026, 0, 11, 12) }), // 4 jam
        // Tak selesai: tak boleh ikut walau rentangnya sangat panjang.
        aduan('Diproses', 0, { createdAt: tgl(2026, 0, 1, 8), updatedAt: tgl(2026, 0, 28, 8) }),
      ];

      expect(hitung(data, '2026-Q1').resolutionStats.averageHours).toBe(3);
    });

    it('openTickets = diterima + diproses (selesai & ditolak tak ikut)', () => {
      const data = [
        aduan('Diterima', 0),
        aduan('Diproses', 0),
        aduan('Diproses', 1),
        aduan('Selesai', 1),
        aduan('Ditolak', 2),
      ];

      expect(hitung(data, '2026-Q1').resolutionStats.openTickets).toBe(3);
    });

    it('angka resolusi hanya dihitung dari periode terpilih, bukan dari seluruh data', () => {
      // Inilah alasan angkanya tak diambil dari GET /dashboard/opd: endpoint itu
      // menghitung sepanjang masa, dan akan menempelkan angka itu di bawah
      // judul triwulan tertentu.
      const data = [aduan('Selesai', 0), aduan('Diterima', 4), aduan('Diterima', 5)];

      expect(hitung(data, '2026-Q1').resolutionStats.completionRate).toBe(100);
      expect(hitung(data, '2026-Q2').resolutionStats.completionRate).toBe(0);
    });
  });

  describe('sebaran status', () => {
    it('selalu keempat status, urut alur penanganan, termasuk yang berjumlah nol', () => {
      const hasil = hitung([aduan('Selesai', 0)], '2026-Q1').statusDistribution;

      expect(hasil.map((s) => s.id)).toEqual(['diterima', 'diproses', 'selesai', 'ditolak']);
      expect(hasil.map((s) => s.count)).toEqual([0, 0, 1, 0]);
    });

    it('persentase dari total periode, dan semuanya 0 bila periodenya kosong (bukan NaN)', () => {
      const data = [aduan('Selesai', 0), aduan('Selesai', 0), aduan('Diterima', 0), aduan('Ditolak', 0)];

      expect(hitung(data, '2026-Q1').statusDistribution.map((s) => s.percentage)).toEqual([
        25, 0, 50, 25,
      ]);
      expect(hitung(data, '2024').statusDistribution.map((s) => s.percentage)).toEqual([0, 0, 0, 0]);
    });

    it('tiap butir membawa warna untuk digambar', () => {
      hitung([aduan('Selesai', 0)], '2026-Q1').statusDistribution.forEach((s) => {
        expect(s.color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe('kategori', () => {
    it('memakai nama dari referensi, terbanyak dulu, dan kode asing jatuh ke kodenya', () => {
      const data = [
        aduan('Diterima', 0, { kategori: 'lapor' }),
        aduan('Diterima', 0, { kategori: 'aduan' }),
        aduan('Diterima', 0, { kategori: 'aduan' }),
        aduan('Diterima', 0, { kategori: 'tak-dikenal' }),
      ];

      expect(hitung(data, '2026-Q1').categories).toEqual([
        { name: 'Aduan', count: 2 },
        { name: 'Laporan', count: 1 },
        { name: 'tak-dikenal', count: 1 },
      ]);
    });
  });

  describe('volume bulanan', () => {
    it('satu triwulan menggambar ketiga bulannya, termasuk bulan yang kosong', () => {
      const data = [aduan('Diterima', 3), aduan('Selesai', 3), aduan('Diterima', 5)]; // Apr, Apr, Jun

      expect(hitung(data, '2026-Q2').volumeMonthly).toEqual([
        { month: 'Apr', received: 2, completed: 1 },
        { month: 'Mei', received: 0, completed: 0 },
        { month: 'Jun', received: 1, completed: 0 },
      ]);
    });

    it('tahun saja menggambar dua belas bulan', () => {
      const hasil = hitung([aduan('Diterima', 0)], '2026').volumeMonthly;

      expect(hasil).toHaveLength(12);
      expect(hasil[0]).toEqual({ month: 'Jan', received: 1, completed: 0 });
      expect(hasil[11].month).toBe('Des');
    });

    it('bulan yang belum tiba tidak digambar sebagai "tak ada yang mengadu"', () => {
      // 7 Oktober 2026: Triwulan IV baru berisi Oktober.
      const hasil = hitung([aduan('Diterima', 9)], '2026-Q4', {
        sekarang: new Date(2026, 9, 7),
      }).volumeMonthly;

      expect(hasil.map((b) => b.month)).toEqual(['Okt']);
    });

    it('tanpa penyaring: hanya bulan yang punya data, enam terakhir', () => {
      const data = [0, 1, 2, 3, 4, 5, 6, 7].map((bulan) => aduan('Diterima', bulan));

      const hasil = hitung(data, '').volumeMonthly;

      expect(hasil.map((b) => b.month)).toEqual(['Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu']);
    });
  });
});
