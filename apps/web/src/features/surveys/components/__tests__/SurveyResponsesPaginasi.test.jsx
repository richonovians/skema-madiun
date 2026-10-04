import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SurveyResponsesScreen from '../SurveyResponsesScreen';
import {
  getSurveyById,
  getQuestions,
  getSurveyResponses,
} from '@/features/surveys/services/surveys.api';

jest.mock('@/features/surveys/services/surveys.api', () => ({
  getSurveyById: jest.fn(),
  getQuestions: jest.fn(),
  getSurveyResponses: jest.fn(),
}));

/**
 * PAGINASI SUNGGUHAN PADA DAFTAR RESPONS (4 Oktober 2026, permintaan pengguna).
 *
 * Layar ini dulu mengambil 100 baris sekali jalan dan berhenti di situ.
 * Selama urutannya menurun, 100 itu berarti "100 terbaru" -- batas yang
 * merugikan tapi masuk akal. Begitu urutannya dibalik menjadi menaik supaya
 * respons #1 ada di atas, 100 itu berubah arti menjadi "100 TERLAMA", dan
 * respons yang baru masuk tak akan pernah terlihat sama sekali pada survei
 * yang melewati angka itu.
 *
 * Paginasi menghapus perkaranya, bukan menambal: tiap halaman diminta sendiri
 * ke backend, yang memang sudah menerima `page` sejak awal.
 *
 * DUA ANGKA DI KARTU RINGKASAN IKUT BERUBAH SUMBERNYA, dan ini bagian yang
 * paling mudah terlewat. Keduanya dulu dihitung dari baris yang kebetulan
 * termuat. Pada layar berpaginasi menaik, "Respons Terakhir" di halaman 1
 * justru akan menampilkan respons PALING LAMA -- bukan sekadar kurang tepat,
 * melainkan terbalik. Keduanya kini diambil dari survei (`GET /surveys/:id`),
 * yang menghitungnya atas SELURUH respons: `ikmScore` (skala 0-100, dibagi 25
 * menjadi skala 1-4 yang dipakai kartu) dan `terakhirMasuk`.
 */
const PER_HALAMAN = 20;

const survei = (over = {}) => ({
  id: '7',
  title: 'Survei Kepuasan Layanan',
  period: '2026-Q1',
  ikmScore: 81.25,
  terakhirMasuk: '2026-10-03T07:15:00.000Z',
  ...over,
});

const barisRespons = (nomor) => ({
  id: String(nomor),
  nomor,
  submittedAt: `2026-10-01T00:00:${String(nomor).padStart(2, '0')}.000Z`,
  averageScore: 3,
  answers: [],
});

const siapkan = ({ total = 45, halaman = 1, surveiOver = {} } = {}) => {
  getSurveyById.mockResolvedValue(survei(surveiOver));
  getQuestions.mockResolvedValue([]);
  getSurveyResponses.mockImplementation((_id, { page = 1 } = {}) => {
    const mulai = (page - 1) * PER_HALAMAN + 1;
    const data = Array.from({ length: Math.min(PER_HALAMAN, total - mulai + 1) }, (_, i) =>
      barisRespons(mulai + i),
    );
    return Promise.resolve({
      data,
      meta: { pagination: { total, page, limit: PER_HALAMAN, totalPages: Math.ceil(total / PER_HALAMAN) } },
    });
  });
  return halaman;
};

describe('SurveyResponsesScreen — paginasi sungguhan', () => {
  beforeEach(() => jest.clearAllMocks());

  it('meminta halaman pertama dengan page tersurat, bukan sekadar limit', async () => {
    siapkan();

    render(<SurveyResponsesScreen surveyId="7" basePath="/admin-opd/surveys" />);

    await waitFor(() =>
      expect(getSurveyResponses).toHaveBeenCalledWith('7', expect.objectContaining({ page: 1 })),
    );
  });

  it('mengambil halaman berikutnya dari backend, bukan memotong daftar yang sama', async () => {
    siapkan({ total: 45 });

    render(<SurveyResponsesScreen surveyId="7" basePath="/admin-opd/surveys" />);
    await screen.findByText('Respons #1');

    fireEvent.click(await screen.findByRole('button', { name: /halaman berikutnya|selanjutnya|next/i }));

    await waitFor(() =>
      expect(getSurveyResponses).toHaveBeenCalledWith('7', expect.objectContaining({ page: 2 })),
    );
    expect(await screen.findByText('Respons #21')).toBeInTheDocument();
  });

  /**
   * PAGAR UTAMA. Inilah cacat yang paling mudah lolos: angka ringkasan yang
   * terlihat masuk akal tetapi diam-diam hanya mewakili satu halaman.
   */
  it('mengambil nilai rata-rata dari seluruh survei, bukan dari halaman', async () => {
    // Halaman 1 seluruhnya bernilai 3, sementara survei sesungguhnya 81,25/25
    // = 3,25. Bila kartunya menghitung sendiri dari halaman, yang muncul 3,00.
    siapkan({ surveiOver: { ikmScore: 81.25 } });

    render(<SurveyResponsesScreen surveyId="7" basePath="/admin-opd/surveys" />);

    expect(await screen.findByText('3.25')).toBeInTheDocument();
  });

  it('tidak mengarang nilai rata-rata ketika survei belum dapat dinilai', async () => {
    // `ikmScore` null terjadi pada survei tanpa responden ATAU yang 9 unsur
    // bakunya dihapus -- rumus IKM berdiri di atas unsur-unsur itu. Menampilkan
    // 0,00 di sana membuat survei yang belum dinilai terbaca sebagai bernilai
    // nol, dua keadaan yang sangat berbeda.
    siapkan({ surveiOver: { ikmScore: null } });

    render(<SurveyResponsesScreen surveyId="7" basePath="/admin-opd/surveys" />);
    await screen.findByText('Respons #1');

    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('tidak lagi menampilkan pita "100 respons terbaru"', async () => {
    siapkan({ total: 45 });

    render(<SurveyResponsesScreen surveyId="7" basePath="/admin-opd/surveys" />);
    await screen.findByText('Respons #1');

    expect(screen.queryByText(/respons terbaru dari total/i)).not.toBeInTheDocument();
  });
});
