import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SampahSurveiOpdPage from '../page';
import { getTrashedSurveys, restoreSurvey } from '@/features/surveys/services/surveys.api';

jest.mock('@/features/surveys/services/surveys.api', () => ({
  getTrashedSurveys: jest.fn(),
  restoreSurvey: jest.fn(),
}));

/**
 * HALAMAN SAMPAH ADMIN OPD (11 September 2026). Bedanya dari milik Kabupaten
 * hanya dua, dan keduanya disengaja: tak ada kolom OPD (semua barisnya milik
 * instansi yang sama) dan TAK ADA tombol Hapus Permanen -- backend menolak peran ini
 * 403, jadi menawarkannya hanya menjanjikan yang pasti gagal.
 */
const BARIS = {
  id: '91',
  title: 'Survei IKM 2026',
  period: '2026-Q2',
  status: 'DITUTUP',
  opdName: 'Dinas Kesehatan',
  deletedAt: '2026-09-10T02:00:00.000Z',
  deletedByName: 'Admin OPD',
  responsesCount: 12,
};

/**
 * `TrashedSurveyTable` merender DUA susunan sekaligus (tabel untuk layar lebar,
 * kartu untuk ponsel) dan memilihnya lewat CSS. Di jsdom keduanya ada, jadi uji
 * di bawah menyasar susunan TABEL secara tersurat -- pencarian global akan
 * menemukan judul yang sama dua kali.
 */
const tabel = () => within(document.querySelector('[data-susunan="tabel"]'));

beforeEach(() => {
  jest.clearAllMocks();
  getTrashedSurveys.mockResolvedValue({ data: [BARIS], meta: { total: 1 } });
  restoreSurvey.mockResolvedValue({});
});

describe('SampahSurveiOpdPage', () => {
  it('menampilkan isi sampah miliknya sendiri, tanpa kolom OPD', async () => {
    render(<SampahSurveiOpdPage />);

    await screen.findAllByText('Survei IKM 2026');
    expect(tabel().getByText('Survei IKM 2026')).toBeInTheDocument();
    expect(screen.queryByText('Dinas Kesehatan')).not.toBeInTheDocument();
  });

  it('TIDAK menawarkan penghapusan permanen', async () => {
    render(<SampahSurveiOpdPage />);
    await screen.findAllByText('Survei IKM 2026');

    expect(screen.queryByRole('button', { name: /hapus permanen/i })).not.toBeInTheDocument();
    expect(screen.getByText(/hubungi Admin Kabupaten/i)).toBeInTheDocument();
  });

  it('Pulihkan memanggil restoreSurvey lalu memuat ulang daftarnya', async () => {
    render(<SampahSurveiOpdPage />);
    await screen.findAllByText('Survei IKM 2026');

    fireEvent.click(tabel().getByRole('button', { name: /pulihkan/i }));

    await waitFor(() => expect(restoreSurvey).toHaveBeenCalledWith('91'));
    await waitFor(() => expect(getTrashedSurveys).toHaveBeenCalledTimes(2));
  });
});
