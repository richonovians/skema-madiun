import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SampahSurveiOpdPage from '../page';
import {
  getTrashedSurveys,
  getTrashRetention,
  purgeSurvey,
  restoreSurvey,
} from '@/features/surveys/services/surveys.api';

jest.mock('@/features/surveys/services/surveys.api', () => ({
  getTrashedSurveys: jest.fn(),
  getTrashRetention: jest.fn(),
  purgeSurvey: jest.fn(),
  restoreSurvey: jest.fn(),
}));

/**
 * HALAMAN SAMPAH ADMIN OPD.
 *
 * BERUBAH 30 September 2026 (permintaan pengguna): peran ini kini BOLEH
 * memusnahkan permanen. Sebelumnya berkas ini menuntut kebalikannya, lengkap
 * dengan keterangan "hubungi Admin Kabupaten" -- kalimat yang sekarang menjadi
 * salah dan karena itu ikut diganti, bukan dibiarkan menganggur.
 *
 * Yang TIDAK berubah: tak ada kolom OPD, sebab seluruh barisnya milik instansi
 * yang sama.
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
  getTrashRetention.mockResolvedValue({ hari: 365 });
  restoreSurvey.mockResolvedValue({});
  purgeSurvey.mockResolvedValue({});
});

describe('SampahSurveiOpdPage', () => {
  it('menampilkan isi sampah miliknya sendiri, tanpa kolom OPD', async () => {
    render(<SampahSurveiOpdPage />);

    await screen.findAllByText('Survei IKM 2026');
    expect(tabel().getByText('Survei IKM 2026')).toBeInTheDocument();
    expect(screen.queryByText('Dinas Kesehatan')).not.toBeInTheDocument();
  });

  it('MENAWARKAN penghapusan permanen', async () => {
    render(<SampahSurveiOpdPage />);
    await screen.findAllByText('Survei IKM 2026');

    expect(tabel().getByRole('button', { name: /hapus permanen/i })).toBeInTheDocument();
  });

  it('kalimat "hubungi Admin Kabupaten" sudah TIDAK ada lagi', async () => {
    // Ia menjadi salah dalam dua hal sekaligus: perannya kini boleh
    // memusnahkan sendiri, dan isi Sampah memang berkurang dengan sendirinya.
    render(<SampahSurveiOpdPage />);
    await screen.findAllByText('Survei IKM 2026');

    expect(screen.queryByText(/hubungi Admin Kabupaten/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/tidak terhapus dengan sendirinya/i)).not.toBeInTheDocument();
  });

  it('menuntut ketik-ulang judul sebelum memusnahkan', async () => {
    // Satu klik tak sepadan dengan tindakan yang membawa serta jawaban warga.
    render(<SampahSurveiOpdPage />);
    await screen.findAllByText('Survei IKM 2026');

    fireEvent.click(tabel().getByRole('button', { name: /hapus permanen/i }));

    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(purgeSurvey).not.toHaveBeenCalled();
  });

  it('memajang umur Sampah dari server, bukan angka tertulis mati', async () => {
    getTrashRetention.mockResolvedValue({ hari: 90 });
    render(<SampahSurveiOpdPage />);
    await screen.findAllByText('Survei IKM 2026');

    expect(await screen.findByTestId('sampah-retensi-notice')).toHaveTextContent('90 hari');
  });

  it('pemusnahan otomatis dimatikan -> tak ada janji umur yang dipajang', async () => {
    getTrashRetention.mockResolvedValue({ hari: null });
    render(<SampahSurveiOpdPage />);
    await screen.findAllByText('Survei IKM 2026');

    expect(screen.queryByTestId('sampah-retensi-notice')).not.toBeInTheDocument();
  });

  it('endpoint umur Sampah gagal TIDAK menggagalkan halaman', async () => {
    // Kebijakan yang tak terbaca bukan alasan menyembunyikan isi Sampah.
    getTrashRetention.mockRejectedValue(new Error('500'));
    render(<SampahSurveiOpdPage />);

    await screen.findAllByText('Survei IKM 2026');
    expect(screen.queryByTestId('sampah-retensi-notice')).not.toBeInTheDocument();
  });

  it('Pulihkan memanggil restoreSurvey lalu memuat ulang daftarnya', async () => {
    render(<SampahSurveiOpdPage />);
    await screen.findAllByText('Survei IKM 2026');

    fireEvent.click(tabel().getByRole('button', { name: /pulihkan/i }));

    await waitFor(() => expect(restoreSurvey).toHaveBeenCalledWith('91'));
    await waitFor(() => expect(getTrashedSurveys).toHaveBeenCalledTimes(2));
  });
});
