import React from 'react';
import { render, screen, within } from '@testing-library/react';
import Footer from '../Footer';

/**
 * TAUTAN CEPAT DI FOOTER (2 November 2026, permintaan pemilik produk).
 *
 * "Bantuan" yang menunjuk `/about#faq` diganti "Tentang Platform" yang
 * menunjuk `/about` -- nama dan alamat yang sama dengan navbar, supaya satu
 * halaman tidak punya dua sebutan. Letaknya tepat di bawah "Layanan", urutan
 * yang juga dipakai navbar.
 */
function tautanCepat() {
  const judul = screen.getByRole('heading', { name: 'Tautan Cepat' });
  return within(judul.parentElement).getAllByRole('link');
}

describe('Footer — tautan cepat', () => {
  it('menampilkan "Tentang Platform" yang menuju /about', () => {
    render(<Footer />);

    expect(screen.getByRole('link', { name: 'Tentang Platform' })).toHaveAttribute('href', '/about');
  });

  it('"Tentang Platform" berada tepat di bawah "Layanan"', () => {
    render(<Footer />);

    expect(tautanCepat().map((a) => a.textContent)).toEqual([
      'Layanan',
      'Tentang Platform',
      'Statistik Pelayanan',
      'Kebijakan Privasi',
    ]);
  });

  it('KONTROL: tautan "Bantuan" tidak tertinggal', () => {
    render(<Footer />);

    expect(screen.queryByRole('link', { name: 'Bantuan' })).toBeNull();
  });
});
