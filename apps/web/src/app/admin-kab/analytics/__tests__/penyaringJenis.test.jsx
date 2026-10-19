import React from 'react';
import { configure, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, paginated, surveyFixture } from '@/mocks/handlers';
import AnalyticsKabPage from '../page';

/**
 * PENYARING JENIS SURVEI DI STATISTIK & LAPORAN ADMIN KABUPATEN (8 Oktober 2026,
 * permintaan pengguna: "tambah filter untuk statistic khusus survei custom dan
 * skm"). Kontrol "Jenis survei" (Semua / SKM / Custom) mempersempit pilihan
 * survei di tab analisis, digabung dengan penyaring periode milik navbar.
 *
 * Pola dan alasan mock-nya sama dengan penyaringPeriode.test.jsx.
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
  surveyFixture({
    id: 6,
    judul: 'Custom Tanpa Jenis Lama',
    periode: '2026-Q2',
    status: 'aktif',
    jenis: undefined,
  }),
];

const NILAI_SURVEI = {
  judul: 'Indeks Kepuasan',
  nilai: 85,
  tampilan: '85%',
  kategori: 'Sangat Puas',
};

/** Mencatat id survei yang hasilnya diminta; survei custom dibalas Nilai Survei. */
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
const pilihanSurvei = () => screen.getByLabelText(/^survei$/i);

describe('Statistik Admin Kab — penyaring jenis survei', () => {
  it('nama tab analisis kini "Analisis Survei" (survei custom ikut tampil di sana)', async () => {
    pasangSurvei();
    render(<AnalyticsKabPage />);

    expect(await screen.findByRole('button', { name: 'Analisis Survei' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Analisis SKM' })).not.toBeInTheDocument();
  });

  it('bawaan "Semua jenis": survei SKM, custom, dan yang tanpa jenis (backend lama) ada semua', async () => {
    const diminta = pasangSurvei();
    render(<AnalyticsKabPage />);

    await waitFor(() => expect(diminta).toHaveBeenCalledWith('2')); // pertama di Q2
    expect(jenis()).toHaveTextContent(/semua jenis/i);

    fireEvent.click(pilihanSurvei());
    expect(await screen.findByRole('button', { name: /SKM Triwulan Dua/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Custom Triwulan Dua/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Custom Tanpa Jenis Lama/ })).toBeInTheDocument();
  });

  it('memilih Custom: hasil yang diambil beralih ke survei custom, SKM keluar dari pilihan', async () => {
    const diminta = pasangSurvei();
    render(<AnalyticsKabPage />);
    await waitFor(() => expect(diminta).toHaveBeenCalledWith('2'));

    await pilihJenis('Custom');

    await waitFor(() => expect(diminta).toHaveBeenCalledWith('5'));
    // Kartu Nilai Survei, bukan Nilai IKM.
    expect(await screen.findByText('Indeks Kepuasan')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.queryByText(/nilai ikm/i)).not.toBeInTheDocument();
    fireEvent.click(pilihanSurvei());
    expect(screen.queryByRole('button', { name: /SKM Triwulan Dua/ })).not.toBeInTheDocument();
  });

  it('memilih SKM: hanya survei SKM; survei tanpa jenis TIDAK ikut', async () => {
    const diminta = pasangSurvei();
    render(<AnalyticsKabPage />);
    await waitFor(() => expect(diminta).toHaveBeenCalledWith('2'));
    await pilihJenis('Custom');
    await waitFor(() => expect(diminta).toHaveBeenCalledWith('5'));
    diminta.mockClear();

    await pilihJenis('SKM');

    await waitFor(() => expect(diminta).toHaveBeenCalledWith('2'));
    expect(diminta).not.toHaveBeenCalledWith('5');
    fireEvent.click(pilihanSurvei());
    expect(screen.queryByRole('button', { name: /Custom/ })).not.toBeInTheDocument();
  });

  it('tersaring dengan penyaring periode: periode lain tak ikut walau jenisnya cocok', async () => {
    const diminta = pasangSurvei();
    mockPeriode = '2026-Q1';
    render(<AnalyticsKabPage />);
    await waitFor(() => expect(diminta).toHaveBeenCalledWith('1'));

    await pilihJenis('Custom');

    // Q1 hanya punya SKM: tak ada hasil baru yang diminta.
    expect(await screen.findByText(/tidak ada survei custom pada/i)).toBeInTheDocument();
    expect(diminta).not.toHaveBeenCalledWith('5');
    expect(diminta).not.toHaveBeenCalledWith('6');
  });

  it('keadaan kosong menyebut jenisnya, dan penyaring TETAP ada supaya dapat dikembalikan', async () => {
    pasangSurvei();
    mockPeriode = '2026-Q1';
    render(<AnalyticsKabPage />);
    await screen.findByLabelText(/jenis survei/i);

    await pilihJenis('Custom');

    expect(await screen.findByText(/tidak ada survei custom pada/i)).toBeInTheDocument();
    expect(jenis()).toBeInTheDocument();

    await pilihJenis('Semua jenis');
    await waitFor(() =>
      expect(screen.queryByText(/tidak ada survei custom pada/i)).not.toBeInTheDocument(),
    );
  });

  it('tak ada survei aktif/ditutup SAMA SEKALI: pesan lama, tanpa penyaring jenis', async () => {
    pasangSurvei([
      surveyFixture({ id: 9, judul: 'Hanya Draf', periode: '2026-Q2', status: 'draft' }),
    ]);
    render(<AnalyticsKabPage />);

    expect(await screen.findByText(/belum ada survei aktif\/ditutup/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/jenis survei/i)).not.toBeInTheDocument();
  });
});
