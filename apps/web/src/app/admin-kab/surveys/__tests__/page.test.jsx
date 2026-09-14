import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminKabSurveysPage from '../page';
import {
  getSurveys,
  duplicateSurvey,
  deleteSurvey,
} from '@/features/surveys/services/surveys.api';
import { getOpdList } from '@/features/opd/services/opd.api';

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }));

jest.mock('@/features/surveys/services/surveys.api', () => ({
  getSurveys: jest.fn(),
  createSurvey: jest.fn(),
  updateSurvey: jest.fn(),
  updateSurveyStatus: jest.fn(),
  deleteSurvey: jest.fn(),
  duplicateSurvey: jest.fn(),
}));

jest.mock('@/features/opd/services/opd.api', () => ({
  getOpdList: jest.fn(),
}));

/**
 * GERBANG KONFIRMASI SALIN SURVEI (permintaan pengguna 8 September 2026).
 *
 * Yang diuji di sini BUKAN tombolnya (itu di
 * features/surveys/components/admin-kab/__tests__/SurveyMonitoringTable.test.jsx),
 * melainkan bahwa halaman ini benar-benar menahan aksinya di ConfirmDialog
 * lebih dahulu. Bedanya penting: tombol yang benar pada tabel tak berarti
 * apa-apa kalau halamannya memanggil endpointnya langsung.
 *
 * `id` sengaja STRING, bukan angka: `adaptSurvey` mengembalikan
 * `id: String(survey.id)`, jadi itulah yang benar-benar diterima
 * `duplicateSurvey` di aplikasi sungguhan.
 */
const SURVEI = {
  id: '1',
  opdId: 7,
  title: 'Survei Layanan Adminduk',
  status: 'DRAF',
  period: '2026-Q3',
  respondentsCount: 0,
  ikmScore: null,
  izinkanAnonim: false,
  isClosed: false,
};

beforeEach(() => {
  jest.clearAllMocks();
  getSurveys.mockResolvedValue({ data: [SURVEI], meta: { total: 1 } });
  getOpdList.mockResolvedValue({
    data: [{ id: 7, name: 'Dinas Kependudukan dan Pencatatan Sipil' }],
    meta: { total: 1 },
  });
  duplicateSurvey.mockResolvedValue({});
  deleteSurvey.mockResolvedValue(undefined);
});

describe('AdminKabSurveysPage — gerbang Salin', () => {
  it('Salin ditahan di dialog dan menyebut nama OPD-nya', async () => {
    render(<AdminKabSurveysPage />);
    await screen.findByText('Survei Layanan Adminduk');

    fireEvent.click(screen.getByRole('button', { name: /^salin$/i }));

    expect(screen.getByText('Salin survei ini?')).toBeInTheDocument();
    expect(
      screen.getByText(/Dinas Kependudukan dan Pencatatan Sipil beserta seluruh pertanyaannya/i),
    ).toBeInTheDocument();
    expect(duplicateSurvey).not.toHaveBeenCalled();
  });

  it('sesudah dikonfirmasi, duplicateSurvey terpanggil dengan id barisnya', async () => {
    render(<AdminKabSurveysPage />);
    await screen.findByText('Survei Layanan Adminduk');

    fireEvent.click(screen.getByRole('button', { name: /^salin$/i }));
    fireEvent.click(screen.getByRole('button', { name: /ya, salin/i }));

    await waitFor(() => expect(duplicateSurvey).toHaveBeenCalledWith('1'));
  });

  it('Batal tidak memanggil apa pun', async () => {
    render(<AdminKabSurveysPage />);
    await screen.findByText('Survei Layanan Adminduk');

    fireEvent.click(screen.getByRole('button', { name: /^salin$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^batal$/i }));

    expect(duplicateSurvey).not.toHaveBeenCalled();
    expect(screen.queryByText('Salin survei ini?')).not.toBeInTheDocument();
  });

  it('daftar dimuat ulang sesudah salinan berhasil', async () => {
    // Tanpa ini, salinannya ada di basis data tetapi tak terlihat sampai
    // pengguna memuat ulang halaman sendiri, dan itu terbaca sebagai gagal.
    render(<AdminKabSurveysPage />);
    await screen.findByText('Survei Layanan Adminduk');
    expect(getSurveys).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /^salin$/i }));
    fireEvent.click(screen.getByRole('button', { name: /ya, salin/i }));

    await waitFor(() => expect(getSurveys).toHaveBeenCalledTimes(2));
  });
});

/**
 * DIALOG BUANG KE SAMPAH (permintaan pengguna 11 September 2026). Bunyinya
 * mengikuti KEADAAN barisnya, bukan satu kalimat untuk semua: yang perlu
 * diketahui sebelum menekan tombol memang berbeda antara draf kosong dan
 * survei aktif yang sudah menampung ratusan jawaban.
 */
describe('AdminKabSurveysPage — dialog buang ke Sampah', () => {
  const surveiAktif = { ...SURVEI, status: 'AKTIF', respondentsCount: 142 };

  it('dialognya menyebut bahwa survei aktif ditutup lebih dulu, dan masih dapat dipulihkan', async () => {
    getSurveys.mockResolvedValue({ data: [surveiAktif], meta: { total: 1 } });
    render(<AdminKabSurveysPage />);
    await screen.findByText('Survei Layanan Adminduk');

    fireEvent.click(screen.getByRole('button', { name: /^hapus$/i }));

    expect(await screen.findByText(/ditutup lebih dulu/i)).toBeInTheDocument();
    expect(screen.getByText(/dipulihkan/i)).toBeInTheDocument();
    expect(deleteSurvey).not.toHaveBeenCalled();
  });

  it('dialognya menyebut jumlah jawaban yang ikut terbawa', async () => {
    getSurveys.mockResolvedValue({ data: [surveiAktif], meta: { total: 1 } });
    render(<AdminKabSurveysPage />);
    await screen.findByText('Survei Layanan Adminduk');

    fireEvent.click(screen.getByRole('button', { name: /^hapus$/i }));

    expect(await screen.findByText(/142 jawaban/i)).toBeInTheDocument();
  });

  it('KONTROL: draf tanpa jawaban tidak diberi dua kalimat yang tak berlaku baginya', async () => {
    // Tanpa uji ini, penyusun pesannya boleh saja selalu menempelkan seluruh
    // kalimat dan kedua uji di atas tetap hijau -- padahal draf tak pernah
    // ditutup dan tak punya jawaban yang terbawa.
    render(<AdminKabSurveysPage />);
    await screen.findByText('Survei Layanan Adminduk');

    fireEvent.click(screen.getByRole('button', { name: /^hapus$/i }));

    expect(await screen.findByText(/dipulihkan/i)).toBeInTheDocument();
    expect(screen.queryByText(/ditutup lebih dulu/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/jawaban yang sudah masuk/i)).not.toBeInTheDocument();
  });

  it('sesudah dikonfirmasi, deleteSurvey terpanggil dengan id barisnya', async () => {
    render(<AdminKabSurveysPage />);
    await screen.findByText('Survei Layanan Adminduk');

    fireEvent.click(screen.getByRole('button', { name: /^hapus$/i }));
    fireEvent.click(screen.getByRole('button', { name: /ya, pindahkan/i }));

    await waitFor(() => expect(deleteSurvey).toHaveBeenCalledWith('1'));
  });
});

describe('AdminKabSurveysPage — pintu masuk Sampah', () => {
  it('punya tautan ke halaman Sampah', async () => {
    // Halaman Sampah yang tak tertaut dari mana pun sama saja dengan tak ada:
    // survei yang terlanjur dibuang akan terlihat seperti hilang.
    render(<AdminKabSurveysPage />);
    await screen.findByText('Survei Layanan Adminduk');

    expect(screen.getByRole('link', { name: /sampah/i })).toHaveAttribute(
      'href',
      '/admin-kab/surveys/sampah',
    );
  });
});
