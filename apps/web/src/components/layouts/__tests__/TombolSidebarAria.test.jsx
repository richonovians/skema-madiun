import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import AdminSidebar from '../AdminSidebar';
import AdminKabSidebar from '../AdminKabSidebar';
import AdminNavbar from '../AdminNavbar';
import AdminKabNavbar from '../AdminKabNavbar';
import { AdminLayoutProvider } from '../AdminLayoutProvider';
import { AdminKabLayoutProvider } from '../AdminKabLayoutProvider';

jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/surveys',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));
jest.mock('@/features/profile/services/profile.api', () => ({
  getMyProfile: jest.fn().mockResolvedValue({
    name: 'Admin Uji',
    nama: 'Admin Uji',
    roleLabel: 'Admin',
    opdId: 1,
    actingRole: 'ADMIN_OPD',
  }),
}));
jest.mock('@/features/opd/services/opd.api', () => ({
  getOpdById: jest.fn().mockResolvedValue({ name: 'Dinas Uji', code: 'DU' }),
}));
jest.mock('@/components/ui/NotificationDropdown', () => ({
  __esModule: true,
  default: () => <div />,
}));
jest.mock('../AdminAccountMenu', () => ({ __esModule: true, default: () => <div /> }));

/**
 * Tombol pengendali sidebar mengumumkan keadaannya (27 Oktober 2026, BUG-042).
 *
 * Tombol ciut desktop hanya bernama lewat `title` yang berganti "Perbesar
 * Sidebar"/"Perkecil Sidebar", dan tombol menu ponsel selalu bernama "Buka menu
 * navigasi" -- juga ketika menunya sudah terbuka. Keduanya tanpa
 * `aria-expanded` maupun `aria-controls`, jadi pembaca layar tak dapat
 * mengatakan apakah sidebar sedang lebar/ciut atau laci ponsel sedang terbuka.
 * Kelas cacat yang sama dengan BUG-037 dan BUG-039.
 */
const KASUS = [
  { nama: 'Admin OPD', Provider: AdminLayoutProvider, Navbar: AdminNavbar, Sidebar: AdminSidebar },
  {
    nama: 'Admin Kabupaten',
    Provider: AdminKabLayoutProvider,
    Navbar: AdminKabNavbar,
    Sidebar: AdminKabSidebar,
  },
];

describe.each(KASUS)('$nama — tombol sidebar', ({ Provider, Navbar, Sidebar }) => {
  const pasang = async () => {
    render(
      <Provider>
        <Navbar />
        <Sidebar />
      </Provider>,
    );
    // Tunggu identitas navbar termuat supaya tak ada pembaruan state yang
    // tercecer sesudah uji selesai.
    await screen.findAllByText('Admin Uji');
  };

  const sasaran = (tombol) => {
    const id = tombol.getAttribute('aria-controls');
    expect(id).toBeTruthy();
    return document.getElementById(id);
  };

  it('tombol ciut desktop: nama tetap, aria-expanded berbalik', async () => {
    await pasang();
    const tombol = screen.getByRole('button', { name: 'Sidebar lebar' });

    expect(tombol).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(tombol);
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(tombol);
    expect(tombol).toHaveAttribute('aria-expanded', 'true');
  });

  it('tombol ciut desktop menunjuk ke <aside> sidebar', async () => {
    await pasang();
    const aside = sasaran(screen.getByRole('button', { name: 'Sidebar lebar' }));

    expect(aside?.tagName).toBe('ASIDE');
  });

  it('tombol menu ponsel: aria-expanded mengikuti laci, menunjuk ke <aside> yang sama', async () => {
    await pasang();
    const tombol = screen.getByRole('button', { name: 'Buka menu navigasi' });
    const asideDesktop = sasaran(screen.getByRole('button', { name: 'Sidebar lebar' }));

    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    expect(sasaran(tombol)).toBe(asideDesktop);

    fireEvent.click(tombol);
    expect(tombol).toHaveAttribute('aria-expanded', 'true');

    // Ditutup dari dalam laci: tombol di navbar ikut melaporkannya.
    fireEvent.click(within(asideDesktop).getByRole('button', { name: 'Tutup menu navigasi' }));
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
  });
});
