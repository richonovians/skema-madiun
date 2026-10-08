import React from 'react';
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, paginated, surveyFixture } from '@/mocks/handlers';
import AnalyticsOpdPage from '../page';

/**
 * PENYARING JENIS SURVEI DI STATISTIK & LAPORAN ADMIN OPD (8 Oktober 2026,
 * permintaan pengguna: "tambah filter untuk statistic khusus survei custom dan
 * skm"). Padanan penyaringJenis.test.jsx milik Admin Kabupaten; yang khas di
 * sini hanya sumber datanya (satu OPD) dan penyaring periode milik navbar OPD.
 */
let mockPeriode = '2026-Q2';
const mockSetPeriode = jest.fn();

jest.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(''),
  useRouter: () => ({ push: jest.fn() }),
}));

// `setPeriode` WAJIB stabil antar-render (lihat penyaringPeriode.test.jsx).
jest.mock('@/components/layouts/AdminLayoutProvider', () => ({
  useAdminLayout: () => ({ periode: mockPeriode, setPeriode: mockSetPeriode }),
}));

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

jest.setTimeout(30000);
beforeAll(() => {
  server.listen({ onUnhandledRequest: 'bypass' });
  configure({ asyncUtilTimeout: 5000 });
});
afterEach(() => {
  server.resetHandlers();
  mockPeriode = '2026-Q2';
  mockSetPeriode.mockClear();
});
afterAll(() => {
  server.close();
  configure({ asyncUtilTimeout: 1000 });
});

const SURVEI = [
  surveyFixture({
    id: 1,
    judul: 'SKM Triwulan Satu',
    periode: '2026-Q1',
    status: 'ditutup',
    jenis: 'skm_permenpanrb',
  }),
  surveyFixture({
    id: 2,
    judul: 'SKM Triwulan Dua',
    periode: '2026-Q2',
    status: 'aktif',
    jenis: 'skm_permenpanrb',
  }),
  surveyFixture({
    id: 5,
    judul: 'Custom Triwulan Dua',
    periode: '2026-Q2',
    status: 'aktif',
    jenis: 'custom',
  }),
];

const NILAI_SURVEI = {
  judul: 'Nilai Survei',
  nilai: 3.4,
  tampilan: '3,40 / 4',
  kategori: 'Sangat Puas',
};

const pasangSurvei = (daftar = SURVEI) => {
  const diminta = jest.fn();
  server.use(
    http.get(`${API_BASE}/surveys`, () => paginated(daftar, '/surveys')),
    http.get(`${API_BASE}/surveys/:id/results`, ({ params }) => {
      diminta(String(params.id));
      const survei = daftar.find((s) => String(s.id) === String(params.id));
      const custom = survei?.jenis === 'custom';
      return ok(
        {
          surveyId: Number(params.id),
          periode: survei?.periode,
          jenis: survei?.jenis,
          jumlahResponden: 5,
          nilaiIkm: custom ? null : 80,
          mutu: custom ? null : 'B',
          nilaiRataRata: 3.4,
          nilaiSurvei: custom ? NILAI_SURVEI : null,
          nrrPerUnsur: custom
            ? []
            : [{ kode: 'U1', teks: 'Persyaratan', nrr: 3.2, nrrTertimbang: 0.35 }],
          sebaranSkor: [],
        },
        `/surveys/${params.id}/results`,
      );
    }),
  );
  return diminta;
};

const jenis = () => screen.getByLabelText(/jenis survei/i);
const pilihJenis = async (nama) => {
  fireEvent.click(jenis());
  fireEvent.click(await screen.findByRole('button', { name: nama }));
};

describe('Statistik Admin OPD — penyaring jenis survei', () => {
  it('nama tab analisis kini "Analisis Survei"', async () => {
    pasangSurvei();
    render(<AnalyticsOpdPage />);

    expect(await screen.findByRole('button', { name: 'Analisis Survei' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Analisis SKM' })).not.toBeInTheDocument();
  });

  it('bawaan "Semua jenis": hasil survei pertama pada periode itu yang diambil', async () => {
    const diminta = pasangSurvei();
    render(<AnalyticsOpdPage />);

    await waitFor(() => expect(diminta).toHaveBeenCalledWith('2'));
    expect(jenis()).toHaveTextContent(/semua jenis/i);
  });

  it('memilih Custom: hasil beralih ke survei custom dan menampilkan kartu Nilai Survei', async () => {
    const diminta = pasangSurvei();
    render(<AnalyticsOpdPage />);
    await waitFor(() => expect(diminta).toHaveBeenCalledWith('2'));

    await pilihJenis('Custom');

    await waitFor(() => expect(diminta).toHaveBeenCalledWith('5'));
    expect(await screen.findByText('3,40 / 4')).toBeInTheDocument();
    expect(screen.queryByText(/nilai ikm/i)).not.toBeInTheDocument();
  });

  it('memilih SKM sesudah Custom mengembalikan survei SKM', async () => {
    const diminta = pasangSurvei();
    render(<AnalyticsOpdPage />);
    await waitFor(() => expect(diminta).toHaveBeenCalledWith('2'));
    await pilihJenis('Custom');
    await waitFor(() => expect(diminta).toHaveBeenCalledWith('5'));
    diminta.mockClear();

    await pilihJenis('SKM');

    await waitFor(() => expect(diminta).toHaveBeenCalledWith('2'));
    expect(diminta).not.toHaveBeenCalledWith('5');
  });

  it('tak ada survei berjenis itu pada periode: pesan menyebut jenisnya, penyaring tetap ada', async () => {
    const diminta = pasangSurvei();
    mockPeriode = '2026-Q1';
    render(<AnalyticsOpdPage />);
    await waitFor(() => expect(diminta).toHaveBeenCalledWith('1'));

    await pilihJenis('Custom');

    expect(await screen.findByText(/tidak ada survei custom pada/i)).toBeInTheDocument();
    expect(diminta).not.toHaveBeenCalledWith('5');
    expect(jenis()).toBeInTheDocument();
  });

  it('tak ada survei aktif/ditutup SAMA SEKALI: pesan lama, tanpa penyaring jenis', async () => {
    pasangSurvei([surveyFixture({ id: 9, judul: 'Hanya Draf', periode: '2026-Q2', status: 'draft' })]);
    render(<AnalyticsOpdPage />);

    expect(await screen.findByText(/belum ada survei aktif\/ditutup/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/jenis survei/i)).not.toBeInTheDocument();
  });
});
