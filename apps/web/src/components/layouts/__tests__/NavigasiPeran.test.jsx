import React from 'react';
import { render, screen } from '@testing-library/react';
import { http } from 'msw';
import { setupServer } from 'msw/node';
import { handlers, ok, userFixture } from '@/mocks/handlers';
import AdminKabSidebar from '../AdminKabSidebar';
import DashboardNavbar from '../DashboardNavbar';
import { AdminKabLayoutProvider } from '../AdminKabLayoutProvider';

/**
 * TC-FE-005 — Menu yang ditawarkan tiap peran.
 *
 * **PREMIS BERKAS INI TERBALIK, BUKAN HILANG (19 Oktober 2026).** Sampai hari
 * ini ia menjaga hal sebaliknya: bahwa **Manajemen User** dan **Audit Logs**
 * hanya milik SUPERUSER dan HARUS DISEMBUNYIKAN dari Admin Kabupaten biasa
 * (keputusan 20 Agustus 2026, dulu bersandar pada `SUPERUSER_ONLY_PREFIXES` di
 * `proxy.js`). Peran `superuser` dilebur ke `kabupaten` pada 15 September 2026
 * dan nilai enumnya dibuang; `SUPERUSER_ONLY_PREFIXES` ikut dibuang bersamanya
 * — lihat `proxy.js` baris 40-43. Kedua menu itu kini MILIK Admin Kabupaten,
 * dirender tanpa syarat peran oleh `AdminKabSidebar`.
 *
 * Empat uji lama karena itu menuntut keadaan yang tak mungkin lagi terjadi, dan
 * dua di antaranya menuntut KEBALIKAN dari perilaku yang sekarang benar. Uji
 * itu tidak dibiarkan memerah dan tidak pula dibuang begitu saja: arahnya
 * dibalik, sebab berkas inilah SATU-SATUNYA yang menguji kedua menu tersebut
 * muncul di navigasi. Membuangnya tanpa pengganti meninggalkan celah.
 *
 * Dua uji lama memang pensiun seutuhnya, dan sebabnya bukan kemalasan:
 *  - "tidak memunculkan menu superuser hanya karena cookie `role` disunting"
 *  - "tidak menampilkan menu superuser selagi peran belum diketahui"
 * Keduanya menjaga kebocoran menu YANG DIGERBANGI PERAN. Tak ada lagi menu
 * semacam itu di sidebar ini, jadi tak ada yang dapat bocor; uji yang menjaga
 * ketiadaan akan hijau selamanya tanpa pernah memeriksa apa pun.
 *
 * Yang masih dijaga:
 *  - kedelapan menu Admin Kabupaten benar-benar ditawarkan, termasuk dua yang dulu
 *    tergerbang — seseorang yang menghidupkan ulang penjaga peran itu akan
 *    memerahkan berkas ini;
 *  - kedua menu tersebut menunjuk rute yang benar;
 *  - menu warga tak kehilangan tautan pokoknya dan tak memuat tautan admin.
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
      ok(userFixture({ id: 1, nama: 'Petugas Uji', roles: [role], actingRole: role, opdId: null }), '/auth/me'),
    ),
  );

const renderSidebar = () =>
  render(
    <AdminKabLayoutProvider>
      <AdminKabSidebar />
    </AdminKabLayoutProvider>,
  );

/**
 * Menu Admin Kabupaten selain dua bekas-superuser di bawah.
 *
 * DIBACA ULANG DARI `AdminKabSidebar` 19 Oktober 2026, bukan diwarisi dari
 * daftar lama — dan daftar lama ternyata basi dalam tiga hal sekaligus:
 * `Manajemen OPD` sudah berganti nama menjadi `Daftar OPD`, lalu
 * `Statistik & Laporan` dan `Dokumentasi API` lahir sesudahnya. Pergeseran itu
 * TERSEMBUNYI selama ini karena uji yang memuatnya sudah memerah lebih dulu
 * karena sebab lain; satu kegagalan menutupi kegagalan berikutnya.
 */
const MENU_UMUM = [
  'Dashboard',
  'Daftar OPD',
  'Monitoring Survei',
  'Pengaduan',
  'Statistik & Laporan',
  'Dokumentasi API',
];
/**
 * Dua menu yang DULU tergerbang peran `superuser` dan sejak 15 September 2026
 * menjadi milik Admin Kabupaten. Namanya dipertahankan agar riwayatnya terbaca.
 */
const MENU_BEKAS_SUPERUSER = ['Manajemen User', 'Audit Logs'];

describe('Sidebar Admin Kabupaten (TC-FE-005)', () => {
  it('menawarkan kedelapan menunya, termasuk dua yang dulu tergerbang superuser', async () => {
    sebagai('kabupaten');
    renderSidebar();

    // Menu umumnya ditunggu lebih dulu. Tanpa ini, "menu X ada" dapat lulus
    // sekadar karena sidebar-nya belum selesai dirender dan querynya kebetulan
    // menemukan apa pun; menunggu satu jangkar memastikan DOM-nya sudah berisi.
    for (const menu of MENU_UMUM) {
      expect(await screen.findByText(menu)).toBeInTheDocument();
    }

    // Inilah pernyataan yang arahnya dibalik 19 Oktober 2026. Dulu kedua menu
    // ini dituntut TIDAK ADA bagi `kabupaten`.
    for (const menu of MENU_BEKAS_SUPERUSER) {
      expect(await screen.findByText(menu)).toBeInTheDocument();
    }
  });

  it('mengarahkan Manajemen User & Audit Logs ke rute yang benar', async () => {
    sebagai('kabupaten');
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
