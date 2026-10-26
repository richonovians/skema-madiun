import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import PilihPeranPage from '../page';

const push = jest.fn();
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
}));

/**
 * Tujuan navigasi dibuat berupa fragmen, karena jsdom hanya menjalankan
 * navigasi yang mengubah fragmen saja; alasannya lengkap ada di
 * `RoleLoginPicker.test.jsx`.
 */
jest.mock('@/constants/roleHome', () => ({
  ROLE_HOME: {
    kabupaten: '#beranda-kabupaten',
    opd: '#beranda-opd',
    responden: '#beranda-responden',
  },
}));

/**
 * HALAMAN PEMILIH PERAN (/pilih-peran), uji pertamanya (26 Oktober 2026).
 *
 * Halaman pertama bagi akun berperan jamak sesudah masuk, dan sampai hari itu
 * tak punya uji sama sekali: 0% baris di Jest, nol spec Playwright di `main`
 * maupun `tester`. Pemilihnya sendiri (`RoleLoginPicker`) sudah diuji; yang
 * belum adalah keputusan HALAMAN ini -- kapan pemilih ditampilkan, dan ke mana
 * tombol tutupnya mengantar.
 *
 * Yang paling penting dijaga: gerbangnya JUMLAH PERAN DARI `GET /auth/roles`,
 * bukan dari peramban. Cookie dan localStorage dapat disunting siapa pun, dan
 * proxy meloloskan halaman ini untuk setiap orang bersesi -- jadi halaman inilah
 * penjaga yang jujur, dan ia harus percaya pada backend.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  window.location.hash = '';
});

const jawabPeran = (data) =>
  server.use(http.get(`${API_BASE}/auth/roles`, () => ok(data, '/auth/roles')));

const AKUN_JAMAK = {
  nama: 'Admin Kabupaten (Contoh)',
  roles: ['kabupaten', 'opd', 'responden'],
  opdId: 5,
  consentRequired: false,
};

describe('/pilih-peran', () => {
  it('menampilkan keadaan memuat sebelum daftar peran tiba', () => {
    jawabPeran(AKUN_JAMAK);
    render(<PilihPeranPage />);

    expect(screen.getByText('Memuat akun...')).toBeInTheDocument();
  });

  it('akun berperan jamak melihat satu tombol untuk setiap perannya', async () => {
    jawabPeran(AKUN_JAMAK);
    render(<PilihPeranPage />);

    expect(await screen.findByText('Admin Kabupaten')).toBeInTheDocument();
    expect(screen.getByText('Admin OPD')).toBeInTheDocument();
    expect(screen.getByText('Masyarakat')).toBeInTheDocument();
    expect(screen.queryByText('Tak ada peran untuk dipilih')).not.toBeInTheDocument();
  });

  it('peran yang sedang dipakai, dibaca dari penyimpanan, ditandai "sedang dipakai"', async () => {
    localStorage.setItem('role', 'opd');
    jawabPeran(AKUN_JAMAK);
    render(<PilihPeranPage />);

    expect(await screen.findByText(/sedang dipakai/i)).toBeInTheDocument();
  });

  it('akun berperan tunggal tidak diberi pemilih, dan diantar kembali ke beranda', async () => {
    jawabPeran({ ...AKUN_JAMAK, roles: ['responden'] });
    render(<PilihPeranPage />);

    expect(await screen.findByText('Tak ada peran untuk dipilih')).toBeInTheDocument();
    expect(screen.queryByText('Admin Kabupaten')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Kembali ke layanan' }));
    expect(push).toHaveBeenCalledWith('/');
  });

  /**
   * Gerbangnya backend, bukan peramban. Penyimpanan yang mengaku "kabupaten"
   * tidak memberi akun berperan tunggal sebuah pemilih.
   */
  it('KONTROL: peran palsu di penyimpanan tidak membuka pemilih bagi akun berperan tunggal', async () => {
    localStorage.setItem('role', 'kabupaten');
    jawabPeran({ ...AKUN_JAMAK, roles: ['responden'] });
    render(<PilihPeranPage />);

    expect(await screen.findByText('Tak ada peran untuk dipilih')).toBeInTheDocument();
    expect(screen.queryByText('Admin Kabupaten')).not.toBeInTheDocument();
  });

  it('daftar peran yang kosong diperlakukan sama dengan peran tunggal', async () => {
    jawabPeran({ ...AKUN_JAMAK, roles: [] });
    render(<PilihPeranPage />);

    expect(await screen.findByText('Tak ada peran untuk dipilih')).toBeInTheDocument();
  });

  /**
   * Menutup = tetap memakai peran sekarang, lewat navigasi KERAS supaya proxy
   * menilai ulang cookie peran. `ROLE_HOME` ditiru menjadi fragmen (lihat
   * tiruan di atas berkas), jadi `location.hash` menyebut beranda yang dituju.
   *
   * Sampai 26 Oktober 2026 uji ini hanya membuktikan "ada navigasi keras" lewat
   * pesan "Not implemented: navigation" dan menyatakan tujuannya tak dapat
   * diperiksa. Tujuannya kini diperiksa.
   */
  it('menutup pemilih kembali ke beranda peran yang sedang dipakai, lewat navigasi keras', async () => {
    localStorage.setItem('role', 'opd');
    jawabPeran(AKUN_JAMAK);
    render(<PilihPeranPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Tutup' }));

    expect(window.location.hash).toBe('#beranda-opd');
    expect(push).not.toHaveBeenCalled();
  });

  /**
   * Tanpa peran tersimpan, tujuannya `'/'`. Diperiksa dari arah sebaliknya:
   * alamat uji dibuat `http://localhost/#awal`, dan `assign('/')` hanya
   * membuang fragmennya. Tujuan lain mana pun adalah navigasi yang tak
   * dijalankan jsdom, dan `#awal` tetap di tempatnya.
   */
  it('tanpa peran tersimpan, menutup pemilih mengantar ke beranda publik', async () => {
    window.location.hash = '#awal';
    jawabPeran(AKUN_JAMAK);
    render(<PilihPeranPage />);

    fireEvent.click(await screen.findByRole('button', { name: 'Tutup' }));

    expect(window.location.hash).toBe('');
  });

  it('kegagalan memuat peran menampilkan galat yang dapat dicoba lagi, dan coba lagi memuat ulang', async () => {
    let panggilan = 0;
    server.use(
      http.get(`${API_BASE}/auth/roles`, () => {
        panggilan += 1;
        if (panggilan === 1) {
          return HttpResponse.json(
            { success: false, statusCode: 500, message: 'Server sedang bermasalah' },
            { status: 500 },
          );
        }
        return ok(AKUN_JAMAK, '/auth/roles');
      }),
    );
    render(<PilihPeranPage />);

    expect(await screen.findByText('Gagal memuat akun')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /coba lagi/i }));

    expect(await screen.findByText('Admin Kabupaten')).toBeInTheDocument();
    expect(panggilan).toBe(2);
  });
});
