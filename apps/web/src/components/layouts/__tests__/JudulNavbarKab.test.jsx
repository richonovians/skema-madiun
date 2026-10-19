import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminKabSidebar from '../AdminKabSidebar';
import { PAGE_TITLES } from '../AdminKabNavbar';

jest.mock('next/navigation', () => ({ usePathname: () => '/admin-kab/dashboard' }));
jest.mock('../AdminKabLayoutProvider', () => ({
  useAdminKabLayout: () => ({ isMobileSidebarOpen: false, setIsMobileSidebarOpen: () => {} }),
}));
jest.mock('../AdminSidebarLogout', () => ({
  __esModule: true,
  default: () => <div data-testid="keluar" />,
}));

/**
 * SETIAP MENU SIDEBAR PUNYA JUDUL NAVBAR (6 Oktober 2026).
 *
 * Cacat yang ditemukan sendiri lewat potret /admin-kab/analytics, bukan
 * dilaporkan pengguna: judul bilahnya berbunyi "Panel Admin Kabupaten", nama
 * umum yang dipakai saat rutenya tak dikenali. Rupanya DUA halaman yang saya
 * tambahkan sendiri tak pernah dimasukkan ke petanya -- `analytics` hari ini
 * dan `dokumentasi-api` kemarin.
 *
 * Diuji sebagai PASANGAN sidebar-navbar, bukan sebagai daftar judul yang
 * ditulis ulang di sini. Daftar yang disalin akan ikut ketinggalan persis
 * seperti petanya; yang menangkap halaman berikutnya adalah sumber kebenaran
 * yang sama dengan yang dilihat pengguna -- tautan di sidebar itu sendiri.
 */
describe('AdminKabNavbar — judul halaman', () => {
  it('tak ada menu sidebar yang jatuh ke judul umum', () => {
    render(<AdminKabSidebar />);

    const rute = screen
      .getAllByRole('link')
      .map((a) => a.getAttribute('href'))
      .filter((href) => href?.startsWith('/admin-kab/'));

    const tanpaJudul = rute.filter(
      (href) => !PAGE_TITLES.some(([awalan]) => href.startsWith(awalan)),
    );

    expect(tanpaJudul).toEqual([]);
  });

  it('awalan yang lebih spesifik didahulukan', () => {
    // `/admin-kab/opd` adalah awalan dari dirinya sendiri saja di sini, tetapi
    // pagar ini menjaga penambahan berikutnya: rute bersarang seperti
    // `/admin-kab/surveys/trash` tak boleh mengambil judul yang salah hanya
    // karena urutan daftarnya berubah.
    const cocok = (path) => PAGE_TITLES.find(([awalan]) => path.startsWith(awalan))?.[1];

    expect(cocok('/admin-kab/analytics')).toBe('Statistik & Laporan');
    expect(cocok('/admin-kab/dokumentasi-api')).toBe('Dokumentasi API');
  });
});
