import React from 'react';
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { complaintFixture, handlers, ok, paginated, surveyFixture } from '@/mocks/handlers';
import AnalyticsKabPage from '../page';

/**
 * PENYARING TAHUN + TRIWULAN DI STATISTIK & LAPORAN ADMIN KABUPATEN (7 Oktober
 * 2026, permintaan pengguna: "tambahkan filter di halaman admin-kab/analytics").
 *
 * Penyaringnya milik navbar (AdminKabLayoutProvider) dan halaman ini hanya
 * MEMBACA `periode`, jadi layout dimock. Pola dan alasannya sama dengan tes
 * halaman Admin OPD (admin-opd/analytics/__tests__/penyaringPeriode.test.jsx);
 * yang khas di sini hanya sumber datanya yang lintas OPD.
 *
 * Tanggal pengaduan dibuat dengan konstruktor LOKAL: pengaduan dibucket dengan
 * `getMonth()` lokal, jadi string ISO UTC akan jatuh ke bulan yang berbeda di
 * mesin berzona waktu lain.
 */
let mockPeriode = '2026-Q2';

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn() }),
}));

jest.mock('@/components/layouts/AdminKabLayoutProvider', () => ({
  useAdminKabLayout: () => ({ periode: mockPeriode }),
}));

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

/**
 * Waktu tunggu dinaikkan khusus berkas ini, alasannya sama dengan berkas
 * padanannya di Admin OPD: halaman memuat beberapa sumber data sekaligus lewat
 * jaringan tiruan, dan batas bawaan 1 detik tak cukup saat seluruh suite
 * berjalan paralel. Dikembalikan di `afterAll` supaya tak bocor ke berkas lain.
 */
jest.setTimeout(30000);
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  configure({ asyncUtilTimeout: 5000 });
});
afterEach(() => {
  server.resetHandlers();
  mockPeriode = '2026-Q2';
});
afterAll(() => {
  server.close();
  configure({ asyncUtilTimeout: 1000 });
});

const tgl = (tahun, bulan, hari = 15) => new Date(tahun, bulan, hari, 12).toISOString();

const SURVEI = [
  surveyFixture({ id: 1, opdId: 1, judul: 'Survei Triwulan Satu', periode: '2026-Q1', status: 'ditutup' }),
  surveyFixture({ id: 2, opdId: 1, judul: 'Survei Triwulan Dua', periode: '2026-Q2', status: 'aktif' }),
  surveyFixture({ id: 3, opdId: 1, judul: 'Survei Draf Dua', periode: '2026-Q2', status: 'draft' }),
  surveyFixture({ id: 4, opdId: 1, judul: 'Survei Tahun Lalu', periode: '2025-Q4', status: 'ditutup' }),
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

    render(<AnalyticsKabPage />);

    await waitFor(() => expect(diminta).toHaveBeenCalledWith('2'));
    expect(diminta).not.toHaveBeenCalledWith('1');
    expect(diminta).not.toHaveBeenCalledWith('3'); // draf
    expect(diminta).not.toHaveBeenCalledWith('4'); // tahun lain
  });

  it('"Semua Triwulan" (tahun saja) mencakup seluruh triwulan tahun itu', async () => {
    // Bentuk `2026` tak pernah sama dengan `2026-Q1`: penyaring yang memakai
    // kesamaan string mengosongkan halaman. Bakunya penyaring Kabupaten memang
    // tahun saja (AdminKabLayoutProvider), jadi inilah keadaan yang PALING
    // sering dilihat pengguna.
    const diminta = pasangSurvei();
    mockPeriode = '2026';

    render(<AnalyticsKabPage />);

    await waitFor(() => expect(diminta).toHaveBeenCalledWith('1')); // pertama di tahun 2026
    expect(diminta).not.toHaveBeenCalledWith('4');
  });

  it('periode tanpa survei: pesan menyebut PERIODE-nya, dan tak ada hasil yang diambil', async () => {
    const diminta = pasangSurvei();
    mockPeriode = '2026-Q3';

    render(<AnalyticsKabPage />);

    expect(await screen.findByText('Tidak ada survei pada Triwulan III - 2026')).toBeInTheDocument();
    expect(diminta).not.toHaveBeenCalled();
  });

  it('tahun saja tanpa survei: label memakai "Tahun", bukan angka telanjang', async () => {
    pasangSurvei();
    mockPeriode = '2030';

    render(<AnalyticsKabPage />);

    expect(await screen.findByText('Tidak ada survei pada Tahun 2030')).toBeInTheDocument();
  });

  it('tak ada survei aktif/ditutup SAMA SEKALI: pesan lama, bukan pesan periode', async () => {
    pasangSurvei([surveyFixture({ id: 9, periode: '2026-Q2', status: 'draft' })]);

    render(<AnalyticsKabPage />);

    expect(await screen.findByText('Belum ada survei aktif/ditutup')).toBeInTheDocument();
    expect(screen.queryByText(/tidak ada survei pada/i)).toBeNull();
  });

  it('pemilih survei tetap menyebut OPD penyelenggara walau daftarnya tersaring', async () => {
    // Penggabungan nama dari GET /opd tak boleh hilang karena daftarnya kini
    // disaring: dua OPD berjudul serupa tampak kembar tanpa nama itu.
    pasangSurvei();
    mockPeriode = '2026-Q2';

    render(<AnalyticsKabPage />);

    await waitFor(() => expect(screen.getByText(/Survei Triwulan Dua - Dinas Kesehatan/)).toBeInTheDocument());
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

    render(<AnalyticsKabPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    // Q1: satu selesai, satu diterima -> masing-masing 50%.
    expect(await screen.findAllByText(/1 pengaduan \(50%\)/)).toHaveLength(2);
  });

  it('tahun saja mencakup seluruh triwulan tahun itu', async () => {
    pasangSurvei();
    pasangPengaduan(DATA);
    mockPeriode = '2026';

    render(<AnalyticsKabPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    // 5 pengaduan: selesai 1, diterima 1, diproses 2, ditolak 1.
    expect(await screen.findByText('2 pengaduan (40%)')).toBeInTheDocument();
  });

  it('periode tanpa pengaduan, padahal ada pengaduan di periode lain: pesan menyebut PERIODE-nya', async () => {
    pasangSurvei();
    pasangPengaduan(DATA);
    mockPeriode = '2024';

    render(<AnalyticsKabPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    expect(await screen.findByText('Tidak ada pengaduan pada Tahun 2024')).toBeInTheDocument();
  });

  it('tanpa pengaduan sama sekali: pesan lama, bukan pesan periode', async () => {
    pasangSurvei();
    pasangPengaduan([]);

    render(<AnalyticsKabPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    expect(await screen.findByText('Belum ada data pengaduan')).toBeInTheDocument();
    expect(screen.queryByText(/tidak ada pengaduan pada/i)).toBeNull();
  });

  it('mengambil SEMUA halaman: pengaduan triwulan lama di halaman kedua ikut terhitung', async () => {
    // 100 pengaduan terbaru (halaman 1) semuanya Q2; yang Q1 baru ada di halaman
    // 2. Tanpa pengambilan semua halaman, penyaring Q1 melihat NOL pengaduan.
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

    render(<AnalyticsKabPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    expect(await screen.findByText('2 pengaduan (100%)')).toBeInTheDocument();
    expect(halamanDiminta).toEqual([1, 2]);
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

    render(<AnalyticsKabPage />);
    await screen.findByRole('button', { name: /analisis pengaduan/i });
    bukaTab(/analisis pengaduan/i);

    expect(await screen.findByRole('note')).toHaveTextContent(/hanya 2\.000 dari 2\.500 pengaduan/i);
  });
});
