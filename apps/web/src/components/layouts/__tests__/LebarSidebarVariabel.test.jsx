import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react';
import AdminSidebar from '../AdminSidebar';
import AdminKabSidebar from '../AdminKabSidebar';
import { AdminLayoutProvider } from '../AdminLayoutProvider';
import { AdminKabLayoutProvider } from '../AdminKabLayoutProvider';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

/**
 * LEBAR SIDEBAR SEBAGAI VARIABEL CSS (30 September 2026, laporan pengguna:
 * "tampilan builder survei ketika sidebar dikecilkan masih terlihat rusak").
 *
 * SEBABNYA TERUKUR. BuilderLayout menutup layar dengan `md:fixed md:inset-0
 * md:left-64`, dan angka 64 itu ditulis mati. Sidebar sendiri beralih antara
 * `md:w-64` dan `md:w-20`. Dengan `--spacing: .25rem` di globals.css --
 * diperiksa pada CSS yang benar-benar dihasilkan, bukan diasumsikan -- itu
 * berarti 256px lawan 80px: begitu sidebar diciutkan, builder tetap mulai di
 * 256px sementara sidebarnya hanya 80px, meninggalkan 176px ruang kosong dan
 * kanvas yang menyempit sebanyak itu.
 *
 * MENGAPA LEWAT VARIABEL CSS, bukan context. Builder dipakai DUA area dengan
 * dua provider berbeda (/admin-kab/surveys/builder dan
 * /admin-opd/(builder)/surveys/builder), dan `useAdminLayout()` MELEMPAR di
 * luar provider-nya -- jadi BuilderLayout tak mungkin memanggil keduanya, dan
 * memanggil salah satunya akan mematikan area yang lain.
 *
 * Polanya sudah berdiri di repo ini: AdminKabNavbar melaporkan tinggi nyatanya
 * ke `--tinggi-navbar-kab` yang dipakai `<main>`. Yang di sini sama persis,
 * hanya sumbunya mendatar.
 *
 * jsdom tak menerapkan CSS, jadi yang diperiksa nilai properti khususnya pada
 * `document.documentElement` -- persis yang dibaca BuilderLayout.
 */
const KASUS = [
  {
    nama: 'AdminSidebar (Admin OPD)',
    Sidebar: AdminSidebar,
    Provider: AdminLayoutProvider,
  },
  {
    nama: 'AdminKabSidebar (Admin Kabupaten)',
    Sidebar: AdminKabSidebar,
    Provider: AdminKabLayoutProvider,
  },
];

const lebar = () => document.documentElement.style.getPropertyValue('--lebar-sidebar');

describe.each(KASUS)('$nama — melaporkan lebarnya ke --lebar-sidebar', ({ Sidebar, Provider }) => {
  afterEach(() => {
    document.documentElement.style.removeProperty('--lebar-sidebar');
  });

  const pasang = () =>
    render(
      <Provider>
        <Sidebar />
      </Provider>,
    );

  it('mengembang: 16rem, sepadan dengan md:w-64', () => {
    pasang();

    expect(lebar()).toBe('16rem');
  });

  it('diciutkan: 5rem, sepadan dengan md:w-20', () => {
    pasang();

    fireEvent.click(screen.getByTitle('Perkecil Sidebar'));

    expect(lebar()).toBe('5rem');
  });

  it('kembali 16rem saat dikembangkan lagi', () => {
    pasang();

    fireEvent.click(screen.getByTitle('Perkecil Sidebar'));
    fireEvent.click(screen.getByTitle('Perbesar Sidebar'));

    expect(lebar()).toBe('16rem');
  });

  it('dibersihkan saat keluar dari area admin', () => {
    // Nilainya milik sidebar ini. Meninggalkannya berarti halaman warga yang
    // dibuka sesudahnya mewarisi lebar sidebar yang sudah tak ada di layar.
    const { unmount } = pasang();
    unmount();

    expect(lebar()).toBe('');
  });
});
