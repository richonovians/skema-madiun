import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminSidebar from '../AdminSidebar';
import AdminKabSidebar from '../AdminKabSidebar';

jest.mock('next/navigation', () => ({ usePathname: () => '/admin-opd/dashboard' }));

jest.mock('../AdminLayoutProvider', () => ({
  useAdminLayout: () => ({ isMobileSidebarOpen: false, setIsMobileSidebarOpen: () => {} }),
}));
jest.mock('../AdminKabLayoutProvider', () => ({
  useAdminKabLayout: () => ({ isMobileSidebarOpen: false, setIsMobileSidebarOpen: () => {} }),
}));
jest.mock('../AdminSidebarLogout', () => ({
  __esModule: true,
  default: () => <div data-testid="keluar" />,
}));

/**
 * PENAMAAN MENU (15 September 2026, permintaan pengguna).
 *
 * "Laporan" di sidebar Admin OPD menuju daftar pengaduan, sementara tepat di
 * bawahnya berdiri "Statistik & Laporan" yang menuju tempat lain sama sekali.
 * Dua menu bersebelahan dengan kata yang sama untuk dua hal berbeda; "Aduan"
 * menghapus tabrakan itu, bukan sekadar mengganti kata.
 */
describe('AdminSidebar — penamaan menu', () => {
  it('menu pengaduan bernama "Aduan"', () => {
    render(<AdminSidebar />);

    const tautan = screen.getByRole('link', { name: 'Aduan' });

    expect(tautan).toHaveAttribute('href', '/admin-opd/complaints');
  });

  it('KONTROL: "Statistik & Laporan" tetap berdiri sendiri', () => {
    render(<AdminSidebar />);

    expect(screen.getByRole('link', { name: /statistik & laporan/i })).toHaveAttribute(
      'href',
      '/admin-opd/analytics',
    );
  });
});

describe('AdminKabSidebar — penamaan menu', () => {
  it('menu OPD bernama "Daftar OPD"', () => {
    render(<AdminKabSidebar />);

    const tautan = screen.getByRole('link', { name: 'Daftar OPD' });

    expect(tautan).toHaveAttribute('href', '/admin-kab/opd');
  });

  /**
   * PASANGAN kontrol. Nama lama yang tertinggal di salah satu tempat membuat
   * satu halaman punya dua nama di layar yang sama -- sidebar menyebutnya
   * begini, judul navbar menyebutnya begitu.
   */
  it('KONTROL: nama lamanya tak tertinggal', () => {
    render(<AdminKabSidebar />);

    expect(screen.queryByText(/manajemen opd/i)).toBeNull();
  });
});
