import React from 'react';
import { act, render, screen } from '@testing-library/react';
import AdminKabNavbar from '../AdminKabNavbar';
import { AdminKabLayoutProvider } from '../AdminKabLayoutProvider';

/**
 * PENYARING TAHUN/TRIWULAN DI NAVBAR ADMIN KABUPATEN (7 Oktober 2026,
 * permintaan pengguna: filter di halaman admin-kab/analytics).
 *
 * Navbar ini hanya memunculkan penyaringnya di halaman yang MEMBACA `periode`
 * (AdminKabLayoutProvider). Sebelumnya hanya dashboard; Statistik & Laporan
 * kini ikut, karena halamannya menyaring pemilih survei dan seluruh angka
 * pengaduan dengannya. Halaman lain TIDAK boleh ikut: kontrol yang tak berefek
 * apa pun adalah masalah lama yang justru dihindari aturan ini.
 *
 * AdminKabNavbar yang SUNGGUHAN dirender, dengan provider yang sungguhan.
 * Tes yang ada memock provider dan menetapkan satu rute, jadi tak satu pun
 * memeriksa kapan penyaringnya muncul.
 */
let mockPath = '/admin-kab/analytics';
jest.mock('next/navigation', () => ({ usePathname: () => mockPath }));

jest.mock('../AdminAccountMenu', () => ({ __esModule: true, default: () => <div /> }));
jest.mock('@/components/ui/NotificationDropdown', () => ({
  __esModule: true,
  default: () => <div />,
}));
jest.mock('@/features/profile/services/profile.api', () => ({
  getMyProfile: jest.fn().mockResolvedValue({ nama: 'Uji', roleLabel: 'Admin Kabupaten' }),
}));

const sajikan = async (path) => {
  mockPath = path;
  await act(async () => {
    render(
      <AdminKabLayoutProvider>
        <AdminKabNavbar />
      </AdminKabLayoutProvider>,
    );
  });
};

describe('AdminKabNavbar — penyaring Tahun & Triwulan', () => {
  it.each([['/admin-kab/dashboard'], ['/admin-kab/analytics']])(
    'muncul di %s, halaman yang membacanya',
    async (path) => {
      await sajikan(path);

      expect(screen.getByLabelText('Tahun')).toBeInTheDocument();
      expect(screen.getByLabelText('Triwulan')).toBeInTheDocument();
    },
  );

  it.each([
    ['/admin-kab/surveys'],
    ['/admin-kab/complaints'],
    ['/admin-kab/opd'],
    ['/admin-kab/users'],
    ['/admin-kab/audit-logs'],
    ['/admin-kab/notifications'],
  ])('TIDAK muncul di %s: halaman itu tak membaca periode', async (path) => {
    await sajikan(path);

    expect(screen.queryByLabelText('Tahun')).toBeNull();
    expect(screen.queryByLabelText('Triwulan')).toBeNull();
  });

  it('anak rute Statistik & Laporan juga mendapat penyaringnya', async () => {
    // `startsWith`, bukan kesamaan persis: rute bersarang di bawah halaman ini
    // tak boleh kehilangan penyaring yang dibaca induknya.
    await sajikan('/admin-kab/analytics/apa-saja');

    expect(screen.getByLabelText('Tahun')).toBeInTheDocument();
  });
});
