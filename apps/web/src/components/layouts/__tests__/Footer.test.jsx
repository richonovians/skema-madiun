import React from 'react';
import { render, screen } from '@testing-library/react';
import Footer from '../Footer';

/**
 * DATA KONTAK SUNGGUHAN DI FOOTER (21 September 2026).
 *
 * Footer ini sebelumnya tak punya uji sama sekali, dan isinya sebagian masih
 * karangan: nomor telepon `(0351) 464xxx` -- dengan "xxx" yang jelas-jelas
 * penampung sementara -- serta dua tombol media sosial yang tautannya `#`,
 * yaitu tautan yang tak menuju ke mana pun.
 *
 * Yang dikunci di sini nilai-nilainya sendiri, bukan susunannya. Alamat,
 * nomor, dan email adalah hal yang diketik ulang orang lain suatu hari nanti,
 * dan salah satu angka yang meleset tak akan terlihat oleh uji tata letak mana
 * pun.
 */
describe('Footer — data kontak dan tautan resmi', () => {
  it('tombol globe menuju situs resmi Pemerintah Kabupaten Madiun', () => {
    render(<Footer />);

    const tautan = screen.getByRole('link', { name: /situs resmi pemerintah kabupaten madiun/i });

    expect(tautan).toHaveAttribute('href', 'https://madiunkab.go.id/');
  });

  it('tombol Instagram menuju akun resmi Pemerintah Kabupaten Madiun', () => {
    render(<Footer />);

    const tautan = screen.getByRole('link', { name: /instagram pemerintah kabupaten madiun/i });

    expect(tautan).toHaveAttribute('href', 'https://www.instagram.com/pemkabmadiun/');
  });

  /**
   * `rel` ikut dikunci, dan itu bukan kerapian: tanpa `noopener`, halaman yang
   * dibuka lewat `target="_blank"` memperoleh `window.opener` dan dapat
   * mengarahkan ulang tab asalnya. Keduanya tautan keluar, jadi keduanya
   * membutuhkannya.
   */
  it('kedua tautan luar dibuka di tab baru tanpa memberi akses ke tab asal', () => {
    render(<Footer />);

    for (const nama of [
      /situs resmi pemerintah kabupaten madiun/i,
      /instagram pemerintah kabupaten madiun/i,
    ]) {
      const tautan = screen.getByRole('link', { name: nama });
      expect(tautan).toHaveAttribute('target', '_blank');
      expect(tautan.getAttribute('rel')).toMatch(/noopener/);
      expect(tautan.getAttribute('rel')).toMatch(/noreferrer/);
    }
  });

  it('menampilkan alamat, nomor telepon, dan email Diskominfo yang sungguhan', () => {
    render(<Footer />);

    expect(screen.getByText('Jl. Mastrip No. 23 Madiun')).toBeInTheDocument();
    expect(screen.getByText('(0351) 462927')).toBeInTheDocument();
    expect(screen.getByText('diskominfo@madiunkab.go.id')).toBeInTheDocument();
  });

  /**
   * PASANGAN yang membuat uji di atas berarti. Nilai lama dulu tampil seolah
   * sah; tanpa penjaga ini, menambahkan nilai baru di tempat lain pada footer
   * yang sama akan tetap lulus sementara nomor karangan itu masih terpasang.
   */
  it('KONTROL: alamat, nomor penampung, dan email lama tak tertinggal', () => {
    render(<Footer />);

    expect(screen.queryByText(/alun-alun utara/i)).toBeNull();
    expect(screen.queryByText(/464xxx/i)).toBeNull();
    expect(screen.queryByText(/hubungi@madiunkab\.go\.id/i)).toBeNull();
  });
});
