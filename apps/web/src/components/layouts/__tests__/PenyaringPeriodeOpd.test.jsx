import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminNavbar from '../AdminNavbar';
import { AdminLayoutProvider } from '../AdminLayoutProvider';

/**
 * PENYARING TAHUN/TRIWULAN DI NAVBAR ADMIN OPD (7 Oktober 2026, permintaan
 * pengguna: filter triwulan dan tahun pada Statistik & Laporan).
 *
 * Navbar ini hanya memunculkan penyaringnya di halaman yang MEMBACA `periode`
 * (AdminLayoutProvider). Sebelumnya hanya dashboard; Statistik & Laporan kini
 * ikut, karena halamannya menyaring pemilih survei, tren IKM, dan seluruh angka
 * pengaduan dengannya. Halaman lain TIDAK boleh ikut: kontrol yang tak berefek
 * apa pun adalah masalah lama yang justru dihindari aturan ini.
 *
 * AdminNavbar yang SUNGGUHAN dirender di sini. Tes layout yang ada hanya
 * me-mock-nya, jadi tak satu pun memeriksa kapan penyaringnya muncul.
 */
let mockPath = '/admin-opd/analytics';
jest.mock('next/navigation', () => ({ usePathname: () => mockPath }));

// Yang diuji kapan penyaringnya MUNCUL, bukan isi identitas maupun menu akun.
jest.mock('@/features/profile/services/profile.api', () => ({
  getMyProfile: jest.fn().mockResolvedValue({
    name: 'Admin Uji',
    roleLabel: 'Admin OPD',
    opdId: 1,
    actingRole: 'ADMIN_OPD',
  }),
}));
jest.mock('@/features/opd/services/opd.api', () => ({
  getOpdById: jest.fn().mockResolvedValue({ name: 'Dinas Uji', code: 'DU' }),
}));
jest.mock('@/components/ui/NotificationDropdown', () => ({
  __esModule: true,
  default: () => <div data-testid="lonceng" />,
}));
jest.mock('../AdminAccountMenu', () => ({
  __esModule: true,
  default: () => <div data-testid="menu-akun" />,
}));

const sajikan = async (path) => {
  mockPath = path;
  render(
    <AdminLayoutProvider>
      <AdminNavbar />
    </AdminLayoutProvider>,
  );
  // Tunggu identitas termuat supaya render tak lagi bergeser saat diperiksa.
  await screen.findByText('Dinas Uji');
};

describe('AdminNavbar — penyaring Tahun & Triwulan', () => {
  it.each([['/admin-opd/dashboard'], ['/admin-opd/analytics']])(
    'muncul di %s, halaman yang membacanya',
    async (path) => {
      await sajikan(path);

      expect(screen.getByLabelText('Tahun')).toBeInTheDocument();
      expect(screen.getByLabelText('Triwulan')).toBeInTheDocument();
    },
  );

  it.each([
    ['/admin-opd/surveys'],
    ['/admin-opd/complaints'],
    ['/admin-opd/notifications'],
    ['/admin-opd/profile'],
  ])('TIDAK muncul di %s: halaman itu tak membaca periode', async (path) => {
    await sajikan(path);

    expect(screen.queryByLabelText('Tahun')).toBeNull();
    expect(screen.queryByLabelText('Triwulan')).toBeNull();
  });

  it('anak rute Statistik & Laporan juga mendapat penyaringnya', async () => {
    // `startsWith`, bukan kesamaan persis: rute bersarang di bawah halaman ini
    // tak boleh kehilangan penyaring yang dibaca induknya.
    await sajikan('/admin-opd/analytics/apa-saja');

    expect(screen.getByLabelText('Tahun')).toBeInTheDocument();
  });
});
