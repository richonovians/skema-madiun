import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { useRouter } from 'next/navigation';
import { handlers } from '@/mocks/handlers';
import SurveyForm from '../SurveyForm';

/**
 * TC-FE-016 — Validasi Wajib Pilih OPD pada formulir pemilihan survei.
 *
 * CATATAN PENOMORAN (11 Agustus 2026): berkas ini semula berlabel TC-FE-004,
 * padahal TC-FE-004 mendeskripsikan "kosongi satu unsur IKM lalu Submit" pada
 * form PENGISIAN survei — komponen yang berbeda. Salah petakan itu dibetulkan:
 * TC-FE-004 kembali menjadi ⬜ (belum ada otomatisasi), dan berkas ini dipetakan
 * ke TC-FE-016 yang memang mendeskripsikan form pemilihan OPD.
 *
 * DITULIS ULANG 10 Agustus 2026. Versi sebelumnya dibuat sebelum frontend
 * terintegrasi dengan backend, sehingga mengasumsikan dua hal yang kini tidak
 * berlaku lagi:
 *   1. Ada dropdown "Layanan" — DIHAPUS (keputusan INT-45: backend tidak punya
 *      konsep layanan sebagai sub-divisi survei), jadi dua kasus uji lama yang
 *      menguji dropdown itu dibuang, bukan diperbaiki.
 *   2. Daftar OPD di-hardcode — kini dimuat dari `GET /opd`, sehingga komponen
 *      punya keadaan memuat dan pengujiannya harus asinkron.
 *   3. Tombol berlabel "Mulai Survei" — kini "Lihat Survei Tersedia", dan
 *      tujuan navigasinya `/surveys?opdId=<id>`, bukan slug OPD.
 */

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('SurveyForm (TC-FE-016: Validasi Wajib Pilih OPD)', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    useRouter.mockReturnValue({ push: mockPush });
    mockPush.mockClear();
  });

  /** Kueri berbasis peran & label — tahan terhadap perubahan styling/struktur DOM. */
  const submitButton = () => screen.getByRole('button', { name: /lihat survei tersedia/i });
  const opdDropdown = () => screen.getByLabelText(/pilih instansi \/ opd/i);

  it('memuat daftar OPD dari API lalu menampilkannya sebagai opsi', async () => {
    render(<SurveyForm />);

    // Keadaan memuat tampil lebih dulu karena daftar OPD diambil dari backend.
    expect(screen.getByText('Memuat daftar instansi...')).toBeInTheDocument();

    // Setelah GET /opd membalas, placeholder berubah dan opsi bisa dibuka.
    expect(await screen.findByText('Pilih Instansi')).toBeInTheDocument();

    fireEvent.click(opdDropdown());
    expect(await screen.findByText('Dinas Kesehatan')).toBeInTheDocument();
    expect(screen.getByText('Dinas Pendidikan')).toBeInTheDocument();
  });

  it('menolak submit dan menampilkan pesan error jika OPD belum dipilih', async () => {
    render(<SurveyForm />);
    await screen.findByText('Pilih Instansi');

    fireEvent.click(submitButton());

    expect(await screen.findByText(/silakan pilih instansi \/ opd/i)).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('mengarahkan ke /surveys?opdId=... setelah OPD dipilih', async () => {
    render(<SurveyForm />);
    await screen.findByText('Pilih Instansi');

    fireEvent.click(opdDropdown());
    fireEvent.click(await screen.findByText('Dinas Kesehatan'));
    fireEvent.click(submitButton());

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/surveys?opdId=1'));
  });

  it('menghapus pesan error begitu OPD dipilih', async () => {
    render(<SurveyForm />);
    await screen.findByText('Pilih Instansi');

    fireEvent.click(submitButton());
    expect(await screen.findByText(/silakan pilih instansi \/ opd/i)).toBeInTheDocument();

    fireEvent.click(opdDropdown());
    fireEvent.click(await screen.findByText('Dinas Kesehatan'));

    await waitFor(() =>
      expect(screen.queryByText(/silakan pilih instansi \/ opd/i)).not.toBeInTheDocument(),
    );
  });
});
