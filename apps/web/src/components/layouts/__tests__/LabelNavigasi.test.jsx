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

/**
 * URUTAN MENU (6 Oktober 2026, permintaan pengguna: "ubah posisi tombol
 * statistik & laporan dibawah tombol Pengaduan pada halaman kabupaten").
 *
 * Diuji sebagai URUTAN, bukan sekadar keberadaan tautannya: yang diminta
 * pengguna justru posisinya, dan tautan yang ada tetapi di tempat lain akan
 * lolos dari uji yang hanya memeriksa `href`.
 */
describe('AdminKabSidebar — urutan menu', () => {
  const urutanHref = () =>
    screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((href) => href?.startsWith('/admin-kab/'));

  it('"Statistik & Laporan" tepat di bawah "Pengaduan"', () => {
    render(<AdminKabSidebar />);

    const urutan = urutanHref();
    const pengaduan = urutan.indexOf('/admin-kab/complaints');

    expect(pengaduan).toBeGreaterThanOrEqual(0);
    expect(urutan[pengaduan + 1]).toBe('/admin-kab/analytics');
  });

  it('KONTROL: delapan menu, tak ada yang hilang atau kembar', () => {
    // Memindahkan satu butir dengan menyalinnya tanpa membuang aslinya
    // melahirkan dua tautan ke halaman yang sama -- dan uji urutan di atas
    // tetap hijau.
    render(<AdminKabSidebar />);

    const urutan = urutanHref();

    expect(urutan).toEqual([
      '/admin-kab/dashboard',
      '/admin-kab/opd',
      '/admin-kab/surveys',
      '/admin-kab/complaints',
      '/admin-kab/analytics',
      '/admin-kab/users',
      '/admin-kab/audit-logs',
      '/admin-kab/dokumentasi-api',
    ]);
  });
});
