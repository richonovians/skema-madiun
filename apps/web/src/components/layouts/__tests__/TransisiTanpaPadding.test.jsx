import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminLayout from '../AdminLayout';

jest.mock('next/navigation', () => ({ usePathname: () => '/admin-opd/analytics' }));
jest.mock('../AdminSidebar', () => ({ __esModule: true, default: () => <div data-testid="sidebar" /> }));
jest.mock('../AdminNavbar', () => ({ __esModule: true, default: () => <div data-testid="navbar" /> }));

/**
 * TRANSISI HANYA UNTUK MARGIN, BUKAN UNTUK PADDING (7 Oktober 2026, laporan
 * pengguna: "terkadang ketika baru pertama kali membuka halaman tersebut
 * tiba-tiba kondisi halaman sudah ter-scroll sedikit ke bawah").
 *
 * TERUKUR, dan hasilnya berbeda dari bunyi laporannya: halaman TIDAK PERNAH
 * tergulir. `scrollY` tetap 0 sepanjang pemuatan; yang bergerak isinya.
 *
 *   ms  380  --tinggi-navbar-opd 112px  padding-top 128px
 *   ms 1293  --tinggi-navbar-opd  80px  padding-top 126.2px
 *   ...                                 (meluncur turun ke 96px)
 *
 * `--tinggi-navbar-opd` bernilai awal 112px di globals.css, lalu AdminNavbar
 * melaporkan tinggi sebenarnya (80px) lewat ResizeObserver. Komentar di
 * globals.css sudah menyatakan niatnya: angka itu "dipakai satu bingkai
 * pertama saja". `transition-all duration-300` pada `<main>` membatalkan niat
 * itu -- `all` ikut menyapu `padding-top`, sehingga koreksi satu bingkai
 * menjadi luncuran 300ms. Isi yang melorot naik 32px itulah yang terbaca
 * seperti halaman sudah tergulir.
 *
 * Hanya area Admin OPD yang terkena: AdminKabLayout memasang transisinya pada
 * div pembungkus, bukan pada `<main>` pemilik paddingnya, dan transisi tidak
 * diwariskan.
 *
 * Nilai awal 112px SENGAJA tidak diubah. globals.css memilih kasus tertinggi
 * dengan alasan kelebihan ruang sesaat hanya terlihat sebagai jarak sementara
 * kekurangan ruang menyembunyikan isi di balik bilah. Yang salah bukan
 * angkanya.
 */
describe('AdminLayout — cakupan transisi', () => {
  const main = () => screen.getByRole('main');

  it('tidak menganimasikan padding: transisinya tak lagi `transition-all`', () => {
    render(<AdminLayout>isi</AdminLayout>);

    expect(main()).not.toHaveClass('transition-all');
  });

  it('transisinya dibatasi pada margin', () => {
    render(<AdminLayout>isi</AdminLayout>);

    expect(main()).toHaveClass('transition-[margin]');
  });

  it('KONTROL: margin sidebar tetap dianimasikan, bukan dimatikan', () => {
    // Mempersempit transisi tak boleh sekalian menghilangkan animasi yang
    // memang dikehendaki saat sidebar menciut.
    render(<AdminLayout>isi</AdminLayout>);

    expect(main()).toHaveClass('duration-300');
    expect(main().className).toMatch(/md:ml-(20|64)/);
  });

  it('KONTROL: padding atas tetap diturunkan dari tinggi navbar yang diukur', () => {
    // Pagar: perbaikan ini tak boleh berubah menjadi "patok saja angkanya".
    render(<AdminLayout>isi</AdminLayout>);

    expect(main().className).toContain('--tinggi-navbar-opd');
  });
});
