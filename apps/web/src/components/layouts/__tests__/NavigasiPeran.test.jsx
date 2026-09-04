import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, userFixture } from '@/mocks/handlers';
import AdminKabSidebar from '../AdminKabSidebar';
import DashboardNavbar from '../DashboardNavbar';
import { AdminKabLayoutProvider } from '../AdminKabLayoutProvider';

/**
 * TC-FE-005 — Navigasi disembunyikan menurut peran.
 *
 * Dua menu Admin Kabupaten hanya milik SUPERUSER (keputusan user 2026-08-20,
 * lihat `SUPERUSER_ONLY_PREFIXES` di proxy.js): **Manajemen User** dan
 * **Audit Logs**. Admin Kabupaten biasa tak boleh melihat keduanya.
 *
 * Yang ditangkap berkas ini:
 *  - penjaga `isSuperuser` hilang → Admin Kabupaten biasa melihat tautan yang
 *    pasti memantulkannya kembali begitu ditekan (proxy menolak, tapi menu itu
 *    sudah terlanjur menjanjikan sesuatu yang tak ada);
 *  - peran dibaca dari cookie `role` alih-alih `GET /auth/me` — cookie dapat
 *    disunting bebas di peramban, jadi menu superuser bisa dimunculkan siapa pun;
 *  - menu warga kehilangan tautan pokoknya.
 *
 * Yang SENGAJA tidak diklaim: menyembunyikan menu bukan penjagaan akses.
 * Penjagaannya ada di proxy.js (navigasi) dan `@Roles` backend (data).
 * Berkas ini menguji apa yang DITAWARKAN kepada pengguna, bukan apa yang
 * diizinkan — dua hal berbeda yang mudah tertukar.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin-kab/dashboard',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const sebagai = (role) =>
  server.use(
    http.get(`${API_BASE}/auth/me`, () =>
      ok(userFixture({ id: 1, nama: 'Petugas Uji', role, opdId: null }), '/auth/me'),
    ),
  );

const renderSidebar = () =>
  render(
    <AdminKabLayoutProvider>
      <AdminKabSidebar />
    </AdminKabLayoutProvider>,
  );

/** Menu yang setiap Admin Kabupaten berhak lihat, superuser atau bukan. */
const MENU_UMUM = ['Dashboard', 'Manajemen OPD', 'Monitoring Survei', 'Pengaduan'];
/** Menu yang HANYA milik superuser. */
const MENU_SUPERUSER = ['Manajemen User', 'Audit Logs'];

describe('Sidebar Admin Kabupaten (TC-FE-005)', () => {
  it('menyembunyikan Manajemen User & Audit Logs dari Admin Kabupaten biasa', async () => {
    sebagai('kabupaten');
    renderSidebar();

    // Ditunggu sampai menu umumnya muncul lebih dulu — tanpa ini, "tak ada"
    // bisa berarti "belum sempat dirender", dan pengujiannya lulus karena
    // memeriksa halaman yang masih kosong.
    for (const menu of MENU_UMUM) {
      expect(await screen.findByText(menu)).toBeInTheDocument();
    }

    for (const menu of MENU_SUPERUSER) {
      expect(screen.queryByText(menu)).not.toBeInTheDocument();
    }
  });

  it('menampilkan kedua menu itu kepada superuser', async () => {
    sebagai('superuser');
    renderSidebar();

    for (const menu of [...MENU_UMUM, ...MENU_SUPERUSER]) {
      expect(await screen.findByText(menu)).toBeInTheDocument();
    }
  });

  it('mengarahkan menu superuser ke rute yang benar', async () => {
    sebagai('superuser');
    renderSidebar();

    expect((await screen.findByText('Manajemen User')).closest('a')).toHaveAttribute(
      'href',
      '/admin-kab/users',
    );
    expect(screen.getByText('Audit Logs').closest('a')).toHaveAttribute(
      'href',
      '/admin-kab/audit-logs',
    );
  });

  it('tidak memunculkan menu superuser hanya karena cookie `role` disunting', async () => {
    // Cookie dapat diubah siapa pun lewat DevTools. Yang menentukan harus
    // jawaban `GET /auth/me`, dan di sini backend berkata "kabupaten".
    document.cookie = 'role=superuser; path=/';
    sebagai('kabupaten');
    renderSidebar();

    await screen.findByText('Dashboard');
    for (const menu of MENU_SUPERUSER) {
      expect(screen.queryByText(menu)).not.toBeInTheDocument();
    }
    document.cookie = 'role=; path=/; max-age=0';
  });

  it('tidak menampilkan menu superuser selagi peran belum diketahui', async () => {
    // Selama `GET /auth/me` masih berjalan, `profile` undefined. Menampilkan
    // menu lebih dulu lalu menyembunyikannya membuat menu berkedip — dan pada
    // sekejap itu Admin Kabupaten biasa sempat melihat tautan yang bukan haknya.
    let lepaskan;
    const tertahan = new Promise((r) => {
      lepaskan = r;
    });
    server.use(
      http.get(`${API_BASE}/auth/me`, async () => {
        await tertahan;
        return ok(userFixture({ id: 1, role: 'kabupaten', opdId: null }), '/auth/me');
      }),
    );

    renderSidebar();

    for (const menu of MENU_SUPERUSER) {
      expect(screen.queryByText(menu)).not.toBeInTheDocument();
    }
    lepaskan();
    await waitFor(() => expect(screen.getByText('Dashboard')).toBeInTheDocument());
  });
});

describe('Navbar warga (TC-FE-005)', () => {
  it('menawarkan seluruh tautan warga dan tak satu pun tautan admin', () => {
    render(<DashboardNavbar />);

    const href = Array.from(document.querySelectorAll('a')).map((a) => a.getAttribute('href'));
    for (const wajib of ['/dashboard', '/complaints', '/surveys']) {
      expect(href).toContain(wajib);
    }
    // Tak satu pun tautan ke area admin boleh ditawarkan kepada warga.
    expect(href.filter((h) => h?.startsWith('/admin-'))).toHaveLength(0);
  });
});
