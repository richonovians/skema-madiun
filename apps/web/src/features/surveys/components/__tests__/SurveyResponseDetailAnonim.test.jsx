import React from 'react';
import { render, screen } from '@testing-library/react';
import SurveyResponseDetailScreen from '../SurveyResponseDetailScreen';
import { getSurveyById, getQuestions, getSurveyResponses } from '@/features/surveys/services/surveys.api';

jest.mock('next/link', () => ({
  __esModule: true,
  default: ({ children, href }) => <a href={href}>{children}</a>,
}));

jest.mock('@/features/surveys/services/surveys.api', () => ({
  getSurveyById: jest.fn(),
  getQuestions: jest.fn(),
  getSurveyResponses: jest.fn(),
}));

/**
 * SUBJUDUL "RESPONS ANONIM" DIPASANGI SYARAT (1 Oktober 2026, permintaan
 * pengguna: "hapus kata tersebut jika pengisi survei tidak memilih sebagai
 * anonim").
 *
 * Kalimat "Respons anonim -- SKM tidak menyimpan identitas pengisi" dulu
 * ditulis TANPA SYARAT APA PUN, sisa dari masa ketika memang tak ada identitas
 * yang disimpan. Sejak 8 September 2026 identitasnya disimpan bila pengisi
 * memilih memberikannya, dan sejak 1 Oktober 2026 ia ditampilkan -- sehingga
 * kalimat itu berdiri tepat di atas kartu yang memajang nama orangnya.
 *
 * Itu bukan sekadar teks usang: ia PERNYATAAN YANG TIDAK BENAR tentang
 * perlakuan data pribadi, pada halaman yang membuktikan sebaliknya.
 */
const JAWABAN = [];

const siapkan = (respondent) => {
  getSurveyById.mockResolvedValue({ id: 3, judul: 'Survei Contoh', title: 'Survei Contoh' });
  getQuestions.mockResolvedValue([]);
  getSurveyResponses.mockResolvedValue({
    data: [
      {
        id: 7,
        surveyId: 3,
        submittedAt: '2026-10-01T00:00:00.000Z',
        answers: JAWABAN,
        ...respondent,
      },
    ],
    meta: { pagination: { total: 1, page: 1, limit: 100, totalPages: 1 } },
  });
};

const render1 = () =>
  render(
    <SurveyResponseDetailScreen surveyId="3" responseId="7" basePath="/admin-opd/surveys" />,
  );

const kalimatAnonim = () => screen.queryByText(/tidak menyimpan identitas pengisi/i);

describe('SurveyResponseDetailScreen — subjudul anonim', () => {
  beforeEach(() => jest.clearAllMocks());

  it('pengisi MEMBERI datanya: kalimatnya tidak muncul', async () => {
    siapkan({ nama: 'Siti Aminah', nomorHp: null, jenisKelamin: null, kelompokUmur: null });

    render1();
    await screen.findByText('Siti Aminah');

    expect(kalimatAnonim()).not.toBeInTheDocument();
  });

  it('pengisi MEMILIH anonim: kalimatnya tetap muncul', async () => {
    // PASANGAN kontrol. Tanpa ini, menghapus kalimatnya sama sekali akan
    // membuat uji di atas hijau selamanya -- padahal pada respons yang memang
    // anonim kalimat itu benar dan berguna.
    siapkan({ nama: null, nomorHp: null, jenisKelamin: null, kelompokUmur: null });

    render1();
    await screen.findByText(/memilih mengisi survei ini sebagai anonim/i);

    expect(kalimatAnonim()).toBeInTheDocument();
  });

  it('KONTROL: judul halaman tetap ada pada kedua keadaan', async () => {
    siapkan({ nama: 'Siti Aminah' });

    render1();

    expect(await screen.findByText('Detail Respons')).toBeInTheDocument();
  });
});
