import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import SampahSurveiKabPage from '../page';
import {
  getTrashedSurveys,
  restoreSurvey,
  purgeSurvey,
} from '@/features/surveys/services/surveys.api';

jest.mock('@/features/surveys/services/surveys.api', () => ({
  getTrashedSurveys: jest.fn(),
  restoreSurvey: jest.fn(),
  purgeSurvey: jest.fn(),
}));

/**
 * HALAMAN SAMPAH ADMIN KABUPATEN (11 September 2026).
 *
 * Peran inilah satu-satunya yang boleh MEMUSNAHKAN, jadi yang paling dijaga di
 * sini bukan tampilnya daftar, melainkan bahwa penghapusan permanen tak pernah terjadi
 * tanpa pengguna mengetik ulang judul surveinya.
 */
const BARIS = {
  id: '91',
  title: 'Survei IKM 2026',
  period: '2026-Q2',
  status: 'DITUTUP',
  opdName: 'Dinas Kesehatan',
  deletedAt: '2026-09-10T02:00:00.000Z',
  deletedByName: 'Admin Kabupaten',
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
  purgeSurvey.mockResolvedValue(undefined);
});

describe('SampahSurveiKabPage', () => {
  it('menampilkan isi sampah beserta kolom OPD-nya', async () => {
    render(<SampahSurveiKabPage />);

    await screen.findAllByText('Survei IKM 2026');
    expect(tabel().getByText('Survei IKM 2026')).toBeInTheDocument();
    expect(tabel().getByText('Dinas Kesehatan')).toBeInTheDocument();
  });

  it('Pulihkan memanggil restoreSurvey lalu memuat ulang daftarnya', async () => {
    // Tanpa muat ulang, baris yang sudah dipulihkan tetap terpampang di Sampah
    // dan pengguna menekannya lagi.
    render(<SampahSurveiKabPage />);
    await screen.findAllByText('Survei IKM 2026');

    fireEvent.click(tabel().getByRole('button', { name: /pulihkan/i }));

    await waitFor(() => expect(restoreSurvey).toHaveBeenCalledWith('91'));
    await waitFor(() => expect(getTrashedSurveys).toHaveBeenCalledTimes(2));
  });

  it('Hapus Permanen ditahan sampai judulnya diketik ulang', async () => {
    render(<SampahSurveiKabPage />);
    await screen.findAllByText('Survei IKM 2026');

    fireEvent.click(tabel().getByRole('button', { name: /hapus permanen/i }));

    // Disasarkan ke DIALOGnya: tombol pemicu di tabel kini bernama sama,
    // sehingga pencarian global cocok dua kali dan menguji tombol yang keliru.
    const tombol = within(await screen.findByRole('dialog')).getByRole('button', {
      name: /hapus permanen/i,
    });
    expect(tombol).toBeDisabled();
    expect(purgeSurvey).not.toHaveBeenCalled();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Survei IKM 2026' } });
    fireEvent.click(tombol);

    await waitFor(() => expect(purgeSurvey).toHaveBeenCalledWith('91'));
  });

  it('dialog hapus permanen menyebut jumlah jawaban yang ikut hilang', async () => {
    // Angka inilah yang membedakan penghapusan survei kosong dari
    // penghapusan data responden, dan hanya halaman ini yang tahu.
    render(<SampahSurveiKabPage />);
    await screen.findAllByText('Survei IKM 2026');

    fireEvent.click(tabel().getByRole('button', { name: /hapus permanen/i }));

    // Disasarkan ke DIALOGnya: kartu ponsel juga menyebut "12 jawaban" pada
    // baris ringkasannya, sehingga pencarian global cocok dua kali dan lulus
    // tanpa benar-benar memeriksa naskah dialognya.
    const dialog = within(await screen.findByRole('dialog'));
    expect(dialog.getByText(/12 jawaban/i)).toBeInTheDocument();
  });

  it('galat pemuatan ditampilkan, bukan daftar kosong yang menyesatkan', async () => {
    getTrashedSurveys.mockRejectedValue(new Error('Gagal menghubungi server'));
    render(<SampahSurveiKabPage />);

    expect(await screen.findByText(/gagal memuat/i)).toBeInTheDocument();
  });
});
