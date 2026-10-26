import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok } from '@/mocks/handlers';
import PersetujuanPage from '../page';

jest.mock('@/hooks/useLogout', () => ({
  useLogout: () => ({ logout: jest.fn(), isLoggingOut: false }),
}));

/**
 * Tujuan navigasi dibuat berupa fragmen, karena jsdom hanya menjalankan
 * navigasi yang mengubah fragmen saja; alasannya lengkap ada di
 * `RoleLoginPicker.test.jsx`. Komponennya tetap memanggil
 * `window.location.assign` sungguhan, dan `location.hash` sesudahnya menyebut
 * beranda mana yang dituju.
 */
jest.mock('@/constants/roleHome', () => ({
  ROLE_HOME: {
    kabupaten: '#beranda-kabupaten',
    opd: '#beranda-opd',
    responden: '#beranda-responden',
  },
}));

/**
 * HALAMAN GERBANG PERSETUJUAN UU PDP (/persetujuan), uji pertamanya
 * (26 Oktober 2026).
 *
 * Proxy mengirim orang ke sini berdasarkan cookie `consent`, yang dapat basi
 * atau disunting. Halaman ini yang menanyakan keadaan sebenarnya ke
 * `GET /auth/me`: yang masih perlu menyetujui melihat gerbangnya, sisanya
 * diantar ke berandanya dengan cookie yang sudah diselaraskan.
 *
 * Uji pertama di bawah memerah ketika ditulis. Halaman ini membaca `me.role`,
 * medan yang tak pernah ada di `GET /auth/me` sejak peran jamak (5 September
 * 2026) -- yang ada `roles` dan `actingRole`. `ROLE_HOME[undefined]` jatuh ke
 * `'/'`, jadi siapa pun yang sudah menyetujui diantar ke beranda publik, bukan
 * ke berandanya sendiri.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});

const jawabMe = (data) => server.use(http.get(`${API_BASE}/auth/me`, () => ok(data, '/auth/me')));

const akun = (over = {}) => ({
  id: 9,
  nama: 'Petugas Uji',
  email: 'uji@example.go.id',
  roles: ['kabupaten', 'responden'],
  actingRole: 'kabupaten',
  opdId: null,
  consentRequired: false,
  ...over,
});

describe('/persetujuan', () => {
  it('yang tak perlu menyetujui diantar ke beranda peran yang sedang dipakainya', async () => {
    jawabMe(akun({ actingRole: 'kabupaten' }));

    render(<PersetujuanPage />);

    await waitFor(() => expect(window.location.hash).toBe('#beranda-kabupaten'));
  });

  it('warga yang sudah menyetujui diantar ke berandanya, dan cookie persetujuannya diselaraskan', async () => {
    jawabMe(akun({ roles: ['responden'], actingRole: 'responden' }));

    render(<PersetujuanPage />);

    await waitFor(() => expect(window.location.hash).toBe('#beranda-responden'));
    // Tanpa penyelarasan ini, cookie basi membuat proxy memantulkannya ke sini lagi.
    expect(localStorage.getItem('consent')).toBe('1');
    expect(document.cookie).toContain('consent=1');
  });

  it('yang masih perlu menyetujui melihat gerbangnya dan TIDAK diantar ke mana pun', async () => {
    jawabMe(akun({ roles: ['responden'], actingRole: 'responden', consentRequired: true }));

    render(<PersetujuanPage />);

    expect(
      await screen.findByRole('heading', { name: /persetujuan pemrosesan data pribadi/i }),
    ).toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });

  /**
   * Gerbangnya menerima peran dari halaman ini lalu memakainya sebagai tujuan
   * sesudah menyetujui. Di dunia nyata hanya `responden` yang pernah perlu
   * menyetujui -- dan itu juga nilai baku `ConsentGate` -- sehingga peran yang
   * salah dikirim tak akan terlihat dari warga. `kabupaten` di sini buatan,
   * semata untuk membuktikan bahwa yang dikirim adalah `actingRole`.
   */
  it('gerbangnya menerima peran yang sedang dipakai, dan menyetujui mengantar ke berandanya', async () => {
    jawabMe(akun({ actingRole: 'kabupaten', consentRequired: true }));
    server.use(
      http.post(`${API_BASE}/auth/consent`, () =>
        ok({ consentAt: '2026-10-26T00:00:00.000Z' }, '/auth/consent'),
      ),
    );

    render(<PersetujuanPage />);

    fireEvent.click(await screen.findByRole('checkbox'));
    fireEvent.click(screen.getByRole('button', { name: /setuju & lanjutkan/i }));

    await waitFor(() => expect(window.location.hash).toBe('#beranda-kabupaten'));
  });

  it('gagal memuat akun menampilkan galat yang dapat dicoba lagi, dan tidak bernavigasi', async () => {
    server.use(
      http.get(`${API_BASE}/auth/me`, () =>
        HttpResponse.json(
          { success: false, statusCode: 500, message: 'Server sedang bermasalah' },
          { status: 500 },
        ),
      ),
    );

    render(<PersetujuanPage />);

    expect(await screen.findByText('Gagal memuat akun')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();
    expect(window.location.hash).toBe('');
  });
});
