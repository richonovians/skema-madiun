import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminKabSurveysPage from '../page';
import { getSurveys, duplicateSurvey } from '@/features/surveys/services/surveys.api';
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
