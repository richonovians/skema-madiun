import React from 'react';
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { complaintFixture, handlers, ok, paginated, surveyFixture } from '@/mocks/handlers';
import AnalyticsOpdPage from '../page';

/**
 * PENYARING TAHUN + TRIWULAN DI STATISTIK & LAPORAN ADMIN OPD (7 Oktober 2026,
 * permintaan pengguna: "tampilkan data di statistic pada halaman admin-opd/
 * analytics dan juga tambahkan filter triwulan dan tahun").
 *
 * Penyaringnya milik navbar (AdminLayoutProvider) dan halaman ini hanya
 * MEMBACA `periode`, jadi layout dimock. Yang diuji adalah perilaku yang
 * terlihat pengguna, bukan penanda yang ditanam di komponen produksi.
 *
 * Tanggal pengaduan dibuat dengan konstruktor LOKAL: pengaduan dibucket dengan
 * `getMonth()` lokal, jadi string ISO UTC akan jatuh ke bulan yang berbeda di
 * mesin berzona waktu lain.
 */
let mockPeriode = '2026-Q2';
let mockTautan = '';
const mockSetPeriode = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(mockTautan),
  useRouter: () => ({ push: jest.fn() }),
}));

// `setPeriode` WAJIB stabil antar-render: `fetchSurveys` bergantung padanya, dan
// fungsi baru tiap render membuat daftar survei diambil ulang tanpa henti.
jest.mock('@/components/layouts/AdminLayoutProvider', () => ({
  useAdminLayout: () => ({ periode: mockPeriode, setPeriode: mockSetPeriode }),
}));

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

/**
 * WAKTU TUNGGU DINAIKKAN KHUSUS BERKAS INI. Halaman ini memuat beberapa sumber
 * data sekaligus (survei, hasil IKM, ringkasan OPD, pengaduan berhalaman) dan
 * semuanya lewat jaringan tiruan. Batas bawaan 1 detik cukup bila berkas
 * dijalankan sendirian, tetapi tidak saat seluruh suite berjalan paralel:
 * tes pertama gagal di sana -- `diminta` tak sempat dipanggil -- padahal lulus
 * berulang kali bila dijalankan sendiri. Yang berubah hanya seberapa lama
 * ditunggu, bukan apa yang diperiksa. Dikembalikan di `afterAll` supaya tak
 * bocor ke berkas lain di pekerja yang sama.
 */
jest.setTimeout(30000);
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  configure({ asyncUtilTimeout: 5000 });
});
afterEach(() => {
  server.resetHandlers();
  mockPeriode = '2026-Q2';
  mockTautan = '';
  mockSetPeriode.mockClear();
});
afterAll(() => {
  server.close();
  configure({ asyncUtilTimeout: 1000 });
});

const tgl = (tahun, bulan, hari = 15) => new Date(tahun, bulan, hari, 12).toISOString();

const SURVEI = [
  surveyFixture({ id: 1, judul: 'Survei Triwulan Satu', periode: '2026-Q1', status: 'ditutup' }),
  surveyFixture({ id: 2, judul: 'Survei Triwulan Dua', periode: '2026-Q2', status: 'aktif' }),
  surveyFixture({ id: 3, judul: 'Survei Draf Dua', periode: '2026-Q2', status: 'draft' }),
  surveyFixture({ id: 4, judul: 'Survei Tahun Lalu', periode: '2025-Q4', status: 'ditutup' }),
];

/** Mencatat id survei yang hasilnya diminta, dan membalas dengan periodenya sendiri. */
const pasangSurvei = (daftar = SURVEI) => {
  const diminta = jest.fn();
  server.use(
    http.get(`${API_BASE}/surveys`, () => paginated(daftar, '/surveys')),
    http.get(`${API_BASE}/surveys/:id/results`, ({ params }) => {
      diminta(String(params.id));
      const survei = daftar.find((s) => String(s.id) === String(params.id));
      return ok(
        {
          surveyId: Number(params.id),
          periode: survei?.periode,
          jumlahResponden: 5,
          nilaiIkm: 80,
          mutu: 'B',
          nrrPerUnsur: [{ kode: 'U1', teks: 'Persyaratan', nrr: 3.2, nrrTertimbang: 0.35 }],
        },
        `/surveys/${params.id}/results`,
      );
    }),
  );
  return diminta;
};

/** Bentuk penuh `/dashboard/opd`: mock baku terlalu ringkas dan adapternya melempar galat. */
const pasangDashboard = (over = {}) =>
  server.use(
    http.get(`${API_BASE}/dashboard/opd`, () =>
      ok(
        {
          ikmScore: 70.5,
          ikmMutu: 'C',
          totalRespondents: 12,
          respondentTrendPercent: 5,
          activeTickets: 2,
          activeOpdUsers: 3,
          avgResponseHours: 4,
          slaTargetHours: 48,
          completionRate: 50,
          performanceMetrics: [],
          recentFeedback: [],
          ikmTrend: [
            { periode: '2025-Q4', value: 70 },
            { periode: '2026-Q1', value: 75 },
            { periode: '2026-Q2', value: 80 },
          ],
          ...over,
        },
        '/dashboard/opd',
      ),
    ),
  );

const aduan = (status, bulan, over = {}) =>
  complaintFixture({
    id: Math.floor(Math.random() * 1e9),
    ticketNo: `PGD${Math.floor(Math.random() * 1e9)}`,
    status,
    createdAt: tgl(2026, bulan),
    updatedAt: tgl(2026, bulan),
    ...over,
  });

const pasangPengaduan = (daftar) =>
  server.use(
    http.get(`${API_BASE}/complaints`, () =>
      paginated(daftar, '/complaints', { limit: 100, total: daftar.length }),
    ),
  );

const bukaTab = (nama) => fireEvent.click(screen.getByRole('button', { name: nama }));

describe('Tab Analisis SKM — pemilih survei mengikuti penyaring periode', () => {
  it('satu triwulan: hasil yang diambil hanya survei pada triwulan itu (bukan draf, bukan tahun lain)', async () => {
    const diminta = pasangSurvei();
    mockPeriode = '2026-Q2';

    render(<AnalyticsOpdPage />);

    await waitFor(() => expect(diminta).toHaveBeenCalledWith('2'));
    expect(diminta).not.toHaveBeenCalledWith('1');
    expect(diminta).not.toHaveBeenCalledWith('3'); // draf
    expect(diminta).not.toHaveBeenCalledWith('4'); // tahun lain
  });

  it('"Semua Triwulan" (tahun saja) mencakup seluruh triwulan tahun itu', async () => {
    // Bentuk `2026` tak pernah sama dengan `2026-Q1`. Penyaring yang memakai
    // kesamaan string mengosongkan halaman -- cacat yang pernah menimpa dashboard.
    const diminta = pasangSurvei();
    mockPeriode = '2026';

    render(<AnalyticsOpdPage />);

    await waitFor(() => expect(diminta).toHaveBeenCalledWith('1')); // pertama di tahun 2026
    expect(diminta).not.toHaveBeenCalledWith('4');
  });

  it('periode tanpa survei: pesan menyebut PERIODE-nya, dan tak ada hasil yang diambil', async () => {
    const diminta = pasangSurvei();
    mockPeriode = '2026-Q3';

    render(<AnalyticsOpdPage />);

    expect(await screen.findByText('Tidak ada survei pada Triwulan III - 2026')).toBeInTheDocument();
    expect(diminta).not.toHaveBeenCalled();
  });

  it('tahun saja tanpa survei: label memakai "Tahun", bukan angka telanjang', async () => {
    pasangSurvei();
    mockPeriode = '2030';

    render(<AnalyticsOpdPage />);

    expect(await screen.findByText('Tidak ada survei pada Tahun 2030')).toBeInTheDocument();
  });

  it('tak ada survei aktif/ditutup SAMA SEKALI: pesan lama, bukan pesan periode', async () => {
    // Dua keadaan kosong yang berbeda: di yang kedua penyaringnyalah yang
    // menyembunyikan, di yang pertama survei memang belum ada.
    pasangSurvei([surveyFixture({ id: 9, periode: '2026-Q2', status: 'draft' })]);

    render(<AnalyticsOpdPage />);

    expect(await screen.findByText('Belum ada survei aktif/ditutup')).toBeInTheDocument();
    expect(screen.queryByText(/tidak ada survei pada/i)).toBeNull();
  });
});

describe('Tab Analisis SKM — tautan "Lihat Hasil" (?surveyId=)', () => {
  it('survei di luar penyaring: PENYARINGNYA yang disesuaikan, dalam bentuk fungsional', async () => {
    pasangSurvei();
    mockTautan = 'surveyId=4'; // 2025-Q4, sedang ditutup
    mockPeriode = '2026-Q2';

    render(<AnalyticsOpdPage />);

    await waitFor(() => expect(mockSetPeriode).toHaveBeenCalledTimes(1));
    const ubah = mockSetPeriode.mock.calls[0][0];
    // Penyaring yang tak mencakup survei itu berpindah ke periodenya...
    expect(ubah('2026-Q2')).toBe('2025-Q4');
    // ...tetapi penyaring yang SUDAH mencakupnya tak dipersempit tanpa perlu.
    expect(ubah('2025')).toBe('2025');
    expect(ubah('2025-Q4')).toBe('2025-Q4');
  });

  it('survei yang sudah berada di penyaring: hasil survei itulah yang dibuka', async () => {
    const diminta = pasangSurvei();
    // Penyaring `2026` mencakup survei 1 (Q1) dan 2 (Q2). Tanpa tautan yang
    // terbuka adalah survei 1, yang PERTAMA lolos -- jadi tautan ke survei 2
    // membedakan "mengikuti tautan" dari "memilih yang pertama". Tautan ke
    // survei 1 akan lulus walau tautannya diabaikan sama sekali.
    mockTautan = 'surveyId=2';
    mockPeriode = '2026';

    render(<AnalyticsOpdPage />);

    await waitFor(() => expect(diminta).toHaveBeenCalledWith('2'));
    expect(diminta).not.toHaveBeenCalledWith('1');
    // Penyaringnya sudah mencakup survei itu, jadi tak ada yang perlu diubah.
    const ubah = mockSetPeriode.mock.calls[0]?.[0];
    expect(ubah ? ubah('2026') : '2026').toBe('2026');
  });

  it('tautan ke survei DRAF diabaikan: penyaring tak diubah', async () => {
    pasangSurvei();
    mockTautan = 'surveyId=3';

    render(<AnalyticsOpdPage />);
    await screen.findByRole('button', { name: /analisis skm/i });
    await waitFor(() => expect(screen.queryByText(/memuat daftar survei/i)).toBeNull());

    expect(mockSetPeriode).not.toHaveBeenCalled();
  });

  it('tanpa tautan: penyaring tak pernah disentuh halaman ini', async () => {
    pasangSurvei();

    render(<AnalyticsOpdPage />);
    await waitFor(() => expect(screen.queryByText(/memuat daftar survei/i)).toBeNull());

    expect(mockSetPeriode).not.toHaveBeenCalled();
  });
});

describe('Tab Analisis SKM — tren IKM per triwulan (OPD ini)', () => {
  it('menampilkan tren untuk TAHUN penyaring, dengan tahunnya di judul', async () => {
    pasangSurvei();
    pasangDashboard();
    mockPeriode = '2026-Q2';

    render(<AnalyticsOpdPage />);

    expect(
      await screen.findByText('Tren Nilai IKM per Triwulan, Tahun 2026'),
    ).toBeInTheDocument();
  });

  it('tahun tanpa titik tren: pesan jujur, bukan grafik kosong', async () => {
    pasangSurvei([surveyFixture({ id: 4, judul: 'Survei 2024', periode: '2024-Q1', status: 'ditutup' })]);
    pasangDashboard();
    mockPeriode = '2024';

    render(<AnalyticsOpdPage />);

    expect(await screen.findByText(/belum ada hasil ikm final yang tercatat pada tahun ini/i)).toBeInTheDocument();
  });

  it('ringkasan OPD gagal dimuat: tab SKM TETAP sehat, tanpa tren dan tanpa pesan karangan', async () => {
    // Mock baku `/dashboard/opd` terlalu ringkas dan membuat adapternya melempar.
    // Kegagalan satu sumber tambahan tak boleh meruntuhkan tab yang sehat.
    const diminta = pasangSurvei();
    mockPeriode = '2026-Q2';

    render(<AnalyticsOpdPage />);

    await waitFor(() => expect(diminta).toHaveBeenCalledWith('2'));
    expect(await screen.findByText(/analisis 9 unsur pelayanan/i)).toBeInTheDocument();
    expect(screen.queryByText(/tren nilai ikm per triwulan/i)).toBeNull();
    expect(screen.queryByText(/belum ada hasil ikm final/i)).toBeNull();
  });

  it('catatan kekurangan kini hanya soal DISTRIBUSI: klaim "tren belum dibangun" sudah dicabut', async () => {
    pasangSurvei();
    pasangDashboard();

    render(<AnalyticsOpdPage />);

    expect(await screen.findByText('Distribusi Skor Belum Tersedia')).toBeInTheDocument();
    expect(screen.queryByText(/tren & distribusi skor belum tersedia/i)).toBeNull();
  });
});

describe('Tab Analisis Pengaduan — angka mengikuti penyaring periode', () => {
  const DATA = [
    aduan('Selesai', 0), // Q1
    aduan('Diterima', 1), // Q1
    aduan('Diproses', 4), // Q2
    aduan('Diproses', 5), // Q2
    aduan('Ditolak', 5), // Q2
  ];

  it('menghitung hanya pengaduan pada triwulan terpilih', async () => {
    pasangSurvei();
    pasangPengaduan(DATA);
    mockPeriode = '2026-Q1';

    render(<AnalyticsOpdPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    // Q1: satu selesai, satu diterima -> masing-masing 50%.
    expect(await screen.findAllByText(/1 pengaduan \(50%\)/)).toHaveLength(2);
  });

  it('panel "Distribusi Status" menampilkan STATUS, bukan menggambar ulang kategori', async () => {
    pasangSurvei();
    pasangPengaduan(DATA);
    mockPeriode = '2026-Q2';

    render(<AnalyticsOpdPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    // Q2: diproses 2, ditolak 1, tak ada yang diterima/selesai.
    expect(await screen.findByText('2 pengaduan (67%)')).toBeInTheDocument();
    expect(screen.getByText('1 pengaduan (33%)')).toBeInTheDocument();
    expect(screen.getAllByText('0 pengaduan (0%)')).toHaveLength(2);
    for (const label of ['Diterima', 'Diproses', 'Selesai', 'Ditolak']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it('tahun saja mencakup seluruh triwulan tahun itu', async () => {
    pasangSurvei();
    pasangPengaduan(DATA);
    mockPeriode = '2026';

    render(<AnalyticsOpdPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    // 5 pengaduan: selesai 1, diterima 1, diproses 2, ditolak 1.
    expect(await screen.findByText('2 pengaduan (40%)')).toBeInTheDocument();
  });

  it('periode tanpa pengaduan, padahal ada pengaduan di periode lain: pesan menyebut PERIODE-nya', async () => {
    pasangSurvei();
    pasangPengaduan(DATA);
    mockPeriode = '2024';

    render(<AnalyticsOpdPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    expect(await screen.findByText('Tidak ada pengaduan pada Tahun 2024')).toBeInTheDocument();
  });

  it('OPD tanpa pengaduan sama sekali: pesan lama, bukan pesan periode', async () => {
    pasangSurvei();
    pasangPengaduan([]);

    render(<AnalyticsOpdPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    expect(await screen.findByText('Belum ada data pengaduan')).toBeInTheDocument();
    expect(screen.queryByText(/tidak ada pengaduan pada/i)).toBeNull();
  });

  it('mengambil SEMUA halaman: pengaduan triwulan lama yang berada di halaman kedua ikut terhitung', async () => {
    // 100 pengaduan terbaru (halaman 1) semuanya Q2; yang Q1 baru ada di halaman 2.
    // Tanpa pengambilan semua halaman, penyaring Q1 melihat NOL pengaduan dan
    // menyatakan "Tidak ada pengaduan" padahal datanya ada.
    pasangSurvei();
    const halamanSatu = Array.from({ length: 100 }, () => aduan('Diproses', 4));
    const halamanDua = [aduan('Selesai', 0), aduan('Selesai', 1)];
    const halamanDiminta = [];
    server.use(
      http.get(`${API_BASE}/complaints`, ({ request }) => {
        const halaman = Number(new URL(request.url).searchParams.get('page') ?? 1);
        halamanDiminta.push(halaman);
        return paginated(halaman === 1 ? halamanSatu : halamanDua, '/complaints', {
          page: halaman,
          limit: 100,
          total: 102,
        });
      }),
    );
    mockPeriode = '2026-Q1';

    render(<AnalyticsOpdPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    expect(await screen.findByText('2 pengaduan (100%)')).toBeInTheDocument();
    expect(halamanDiminta).toEqual([1, 2]);
    expect(screen.queryByText(/hanya .* dari .* pengaduan terbaru/i)).toBeNull();
  });

  it('data melebihi batas pengambilan: pengguna DIBERI TAHU bahwa angkanya belum utuh', async () => {
    pasangSurvei();
    server.use(
      http.get(`${API_BASE}/complaints`, ({ request }) => {
        const halaman = Number(new URL(request.url).searchParams.get('page') ?? 1);
        return paginated(
          Array.from({ length: 100 }, () => aduan('Diproses', 4)),
          '/complaints',
          { page: halaman, limit: 100, total: 2500 },
        );
      }),
    );

    render(<AnalyticsOpdPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    expect(await screen.findByRole('note')).toHaveTextContent(/hanya 2\.000 dari 2\.500 pengaduan/i);
  });
});

describe('Tab Statistik Publik DIHAPUS (7 Oktober 2026, permintaan pengguna)', () => {
  /**
   * Sempat ada tab ketiga, "Statistik Publik", yang menampilkan data lintas OPD
   * dari GET /statistics. Pengguna memintanya dibuang. Dua hal dijaga supaya ia
   * tak kembali diam-diam lewat salinan kode lama.
   */
  it('hanya dua tab: Analisis SKM dan Analisis Pengaduan', async () => {
    pasangSurvei();

    render(<AnalyticsOpdPage />);

    expect(await screen.findByRole('button', { name: /analisis skm/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /analisis pengaduan/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /statistik publik/i })).toBeNull();
    expect(screen.getAllByRole('button', { name: /^analisis /i })).toHaveLength(2);
  });

  it('halaman tak lagi meminta GET /statistics sama sekali', async () => {
    // Pengambilan datanya dulu eager (dipanggil saat halaman dibuka, walau
    // tabnya tak pernah diklik). Menghapus tab tanpa menghapus pengambilannya
    // meninggalkan satu permintaan yang tak dipakai siapa pun di setiap kunjungan.
    pasangSurvei();
    const diminta = jest.fn();
    server.use(
      http.get(`${API_BASE}/statistics`, () => {
        diminta();
        return ok({}, '/statistics');
      }),
    );

    render(<AnalyticsOpdPage />);
    await screen.findByRole('button', { name: /analisis skm/i });
    await waitFor(() => expect(screen.queryByText(/memuat daftar survei/i)).toBeNull());
    fireEvent.click(screen.getByRole('button', { name: /analisis pengaduan/i }));
    // Ditunggu sampai tab pengaduan selesai dimuat, supaya "tidak pernah
    // dipanggil" berarti tak pernah, bukan belum.
    await waitFor(() => expect(screen.queryByText(/memuat data pengaduan/i)).toBeNull());

    expect(diminta).not.toHaveBeenCalled();
  });
});
