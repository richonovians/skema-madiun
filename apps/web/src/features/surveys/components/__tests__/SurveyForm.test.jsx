import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { useRouter } from 'next/navigation';
import { handlers } from '@/mocks/handlers';
import { isAuthenticated } from '@/features/authentication/services/authStorage';
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

/**
 * `isAuthenticated` dimock dengan `requireActual` untuk ekspor lainnya, BUKAN
 * seluruh modulnya: `services/api.js` memakai `clearSession` dan `getToken`
 * dari modul yang sama pada interseptornya, dan mengosongkan keduanya membuat
 * interseptor itu meledak alih-alih menguji apa pun.
 *
 * Bakunya `true` di `beforeEach`, dan itu bukan kemalasan: seluruh uji yang
 * sudah ada di berkas ini ditulis ketika komponennya belum sadar sesi. Tanpa
 * baku itu, mereka semua akan mendapat pesan "masuk terlebih dahulu" dan
 * berhenti menguji hal yang mereka maksud.
 */
jest.mock('@/features/authentication/services/authStorage', () => ({
  ...jest.requireActual('@/features/authentication/services/authStorage'),
  isAuthenticated: jest.fn(),
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
    isAuthenticated.mockReturnValue(true);
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

/**
 * PESAN MENURUT KEADAAN SESI (permintaan pengguna 8 September 2026).
 *
 * Sebabnya terukur: `getOpdList()` menuntut sesi, dan `GET /api/v1/opd`
 * menjawab 401 tanpa sesi. Jadi pengunjung beranda yang belum masuk SELALU
 * melihat dropdown kosong, lalu menekan tombolnya memunculkan "Silakan pilih
 * Instansi / OPD" yaitu menyuruhnya melakukan hal yang tak mungkin.
 *
 * Kasus "gagal memuat" dibuat dengan 500, BUKAN 401: interseptor 401 di
 * services/api.js membuang sesi lalu menavigasi, dan keduanya cuma menambah
 * kebisingan yang tak berhubungan dengan yang diuji di sini.
 */
describe('SurveyForm — pesan menurut keadaan sesi', () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    useRouter.mockReturnValue({ push: mockPush });
    mockPush.mockClear();
  });

  const submitButton = () => screen.getByRole('button', { name: /lihat survei tersedia/i });

  it('TANPA sesi: menyuruh masuk lebih dahulu, bukan menyuruh memilih instansi', async () => {
    isAuthenticated.mockReturnValue(false);
    render(<SurveyForm />);

    fireEvent.click(submitButton());

    expect(await screen.findByText(/masuk terlebih dahulu/i)).toBeInTheDocument();
    expect(screen.queryByText(/silakan pilih instansi \/ opd/i)).not.toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  /**
   * DIBALIK 8 September 2026. Sebelumnya uji ini menuntut tautan "Masuk
   * sekarang" ADA di layar; pengguna kemudian meminta paragraf beserta
   * tautannya dihapus, dan cukup penampung dropdown yang menghimbau masuk.
   *
   * Uji ini bukan dibuang melainkan dibalik arahnya, sebab yang perlu dijaga
   * justru bertambah: himbauannya harus tetap terbaca DI SUATU TEMPAT. Uji yang
   * hanya dihapus akan membiarkan keadaan tanpa sesi kembali bisu tanpa satu
   * pun uji memerah.
   */
  it('TANPA sesi: himbauan masuk hanya di penampung dropdown, tanpa paragraf & tautan', async () => {
    isAuthenticated.mockReturnValue(false);
    render(<SurveyForm />);

    expect(await screen.findByText(/masuk untuk melihat daftar instansi/i)).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /masuk sekarang/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/hanya tersedia bagi pengguna yang sudah masuk/i)).not.toBeInTheDocument();
  });

  /**
   * KONTROL. Tanpa uji ini, perbaikan di atas dapat lulus dengan cara membuang
   * pesan "silakan pilih instansi" dari SEMUA keadaan, termasuk keadaan yang
   * pesannya memang sudah benar.
   */
  it('KONTROL: dengan sesi dan tanpa pilihan, pesannya tetap yang lama', async () => {
    isAuthenticated.mockReturnValue(true);
    render(<SurveyForm />);
    await screen.findByText('Pilih Instansi');

    fireEvent.click(submitButton());

    expect(await screen.findByText(/silakan pilih instansi \/ opd/i)).toBeInTheDocument();
    expect(screen.queryByText(/masuk terlebih dahulu/i)).not.toBeInTheDocument();
  });

  it('dengan sesi tapi gagal memuat: penampungnya menyatakan gagal, bukan "Pilih Instansi"', async () => {
    // 500, bukan 401: interseptor 401 di services/api.js membuang sesi lalu
    // menavigasi, dan keduanya cuma kebisingan bagi yang diuji di sini.
    isAuthenticated.mockReturnValue(true);
    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
    server.use(http.get(`${API_BASE}/opd`, () => new HttpResponse(null, { status: 500 })));

    render(<SurveyForm />);

    expect(await screen.findByText(/daftar instansi gagal dimuat/i)).toBeInTheDocument();
  });
});
