import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AdminSidebar from '../AdminSidebar';
import AdminKabSidebar from '../AdminKabSidebar';
import { AdminLayoutProvider } from '../AdminLayoutProvider';
import { AdminKabLayoutProvider } from '../AdminKabLayoutProvider';

jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

/**
 * CIUT SIDEBAR BOCOR KE LAYAR SEMPIT (23 September 2026, laporan pengguna:
 * "fitur perkecil sidebar ... di perangkat yang layarnya tidak lebar jadi
 * aneh/bug").
 *
 * Semua yang MEMAKAI state ciut sudah dipagari `md:` dan bekerja benar: margin
 * konten `md:ml-20` di AdminLayout, offset navbar `md:left-20`, bahkan tombol
 * pengalihnya sendiri `hidden md:flex`. Yang TIDAK dipagari justru sidebarnya:
 * lebarnya `w-20` tanpa syarat, dan ke-16 labelnya dibuang dari DOM lewat
 * `{!isDesktopSidebarCollapsed && ...}` tanpa memandang lebar layar.
 *
 * Akibatnya, bila state ciut menyala lalu layar menyempit di bawah 768px, laci
 * ponsel terbuka sebagai strip 80px berisi ikon tanpa nama. Tombol untuk
 * mengembalikannya adalah SATU-SATUNYA pemanggil `setIsDesktopSidebarCollapsed`
 * -- sudah diperiksa, tak ada pemanggil lain -- sekaligus `hidden` di bawah
 * `md`, sehingga keadaan itu tak dapat dipulihkan tanpa memuat ulang halaman.
 *
 * Arah perbaikannya menyamakan pagarnya dengan yang sudah benar di sekitarnya,
 * murni lewat CSS: label tetap dirender tetapi disembunyikan `md:hidden`, dan
 * penyempitan lebar hanya berlaku `md:` ke atas. Menyelesaikannya lewat JS
 * (pendengar resize atau media query) akan memunculkan beda hasil antara
 * render server dan peramban, yang tak dipunyai pendekatan CSS.
 *
 * jsdom tidak menerapkan CSS, jadi yang diperiksa di sini keberadaan elemen di
 * DOM dan kelas yang dibawanya -- persis dua hal yang saat ini salah.
 */
const KASUS = [
  {
    nama: 'AdminSidebar (Admin OPD)',
    Sidebar: AdminSidebar,
    Provider: AdminLayoutProvider,
    label: 'Dashboard',
  },
  {
    nama: 'AdminKabSidebar (Admin Kabupaten)',
    Sidebar: AdminKabSidebar,
    Provider: AdminKabLayoutProvider,
    label: 'Daftar OPD',
  },
];

describe.each(KASUS)(
  '$nama — ciut hanya berlaku dari md ke atas',
  ({ Sidebar, Provider, label }) => {
    const pasangLaluCiutkan = () => {
      const hasil = render(
        <Provider>
          <Sidebar />
        </Provider>,
      );
      fireEvent.click(screen.getByTitle('Perkecil Sidebar'));
      return hasil;
    };

    it('tetap merender label menu walau sedang diciutkan', () => {
      pasangLaluCiutkan();

      // Saat ini label DIBUANG dari DOM, jadi di layar sempit laci ponsel hanya
      // berisi ikon tanpa nama, tanpa cara mengembalikannya.
      expect(screen.getByText(label)).toBeInTheDocument();
    });

    it('menyembunyikan label itu hanya dari md ke atas', () => {
      pasangLaluCiutkan();

      // Bukan sekadar "ada di DOM": tanpa `md:hidden` label akan ikut tampil di
      // sidebar desktop yang sengaja diciutkan, yaitu membatalkan fiturnya.
      expect(screen.getByText(label).className).toMatch(/md:hidden/);
    });

    it('menyempitkan lebar sidebar hanya dari md ke atas', () => {
      const { container } = pasangLaluCiutkan();
      const kelas = container.querySelector('aside').className;

      expect(kelas).toMatch(/md:w-20/);
      // `w-20` polos berlaku di semua lebar; itulah yang membuat laci ponsel
      // menyusut jadi 80px.
      expect(kelas).not.toMatch(/(^|\s)w-20(\s|$)/);
    });
  },
);
