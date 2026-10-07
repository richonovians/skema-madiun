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
 * yang menghitungnya atas SELURUH respons: `averageScore` (rata-rata semua
 * jawaban skala 1-4; sebelum 7 Oktober 2026 berasal dari `ikmScore / 25`) dan
 * `terakhirMasuk`.
 */
const PER_HALAMAN = 20;

// `ikmScore` SENGAJA berbeda dari `averageScore` (50 -> 2,00 bila masih
// diturunkan dari IKM, sedangkan rata-rata sebenarnya 3,25): fixture yang
// menyamakan keduanya meloloskan kartu yang masih membaca sumber lama.
const survei = (over = {}) => ({
  id: '7',
  title: 'Survei Kepuasan Layanan',
  period: '2026-Q1',
  ikmScore: 50,
  averageScore: 3.25,
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
    // Halaman 1 seluruhnya bernilai 3, sementara rata-rata survei sesungguhnya
    // 3,25. Bila kartunya menghitung sendiri dari halaman, yang muncul 3,00.
    siapkan({ surveiOver: { averageScore: 3.25 } });

    render(<SurveyResponsesScreen surveyId="7" basePath="/admin-opd/surveys" />);

    expect(await screen.findByText('3.25')).toBeInTheDocument();
  });

  it('TIDAK lagi menurunkan nilai rata-rata dari IKM (IKM ÷ 25)', async () => {
    // Sumber lama. Dengan ikmScore 50 ia akan menampilkan 2.00; yang benar 3.25.
    siapkan({ surveiOver: { ikmScore: 50, averageScore: 3.25 } });

    render(<SurveyResponsesScreen surveyId="7" basePath="/admin-opd/surveys" />);
    await screen.findByText('Respons #1');

    expect(screen.getByText('3.25')).toBeInTheDocument();
    expect(screen.queryByText('2.00')).not.toBeInTheDocument();
  });

  it('survei TANPA 9 unsur baku (IKM null) tetap menampilkan nilai rata-rata', async () => {
    // Kasus yang melahirkan perubahan ini. IKM null karena rumusnya berdiri di
    // atas 9 unsur baku, padahal jawaban skalanya ada dan rata-ratanya terhitung.
    siapkan({ surveiOver: { ikmScore: null, averageScore: 3.84 } });

    render(<SurveyResponsesScreen surveyId="7" basePath="/admin-opd/surveys" />);

    expect(await screen.findByText('3.84')).toBeInTheDocument();
    expect(screen.queryByText('–')).not.toBeInTheDocument();
  });

  it('tidak mengarang nilai rata-rata ketika belum ada jawaban skala', async () => {
    // `averageScore` null hanya bila belum ada satu pun jawaban skala. Menampilkan
    // 0,00 di sana membuat survei yang belum dinilai terbaca sebagai bernilai
    // nol, dua keadaan yang sangat berbeda.
    siapkan({ surveiOver: { ikmScore: null, averageScore: null } });

    render(<SurveyResponsesScreen surveyId="7" basePath="/admin-opd/surveys" />);
    await screen.findByText('Respons #1');

    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('TIDAK jatuh kembali ke IKM bila nilai rata-rata null', async () => {
    // Dua definisi dalam satu kartu membuat angkanya tak lagi dapat dibaca.
    siapkan({ surveiOver: { ikmScore: 81.25, averageScore: null } });

    render(<SurveyResponsesScreen surveyId="7" basePath="/admin-opd/surveys" />);
    await screen.findByText('Respons #1');

    expect(screen.queryByText('3.25')).not.toBeInTheDocument();
    expect(screen.getByText('–')).toBeInTheDocument();
  });

  it('tidak lagi menampilkan pita "100 respons terbaru"', async () => {
    siapkan({ total: 45 });

    render(<SurveyResponsesScreen surveyId="7" basePath="/admin-opd/surveys" />);
    await screen.findByText('Respons #1');

    expect(screen.queryByText(/respons terbaru dari total/i)).not.toBeInTheDocument();
  });
});
