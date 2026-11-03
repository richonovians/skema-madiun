import React from 'react';
import { render, screen } from '@testing-library/react';
import ProfileAccountCard from '../ProfileAccountCard';

/**
 * KARTU INFORMASI AKUN TANPA "ID RESPONDEN" (2 November 2026).
 *
 * ID itu nomor baris basis data. Ia tak berguna bagi warga dan tak dipakai di
 * alur mana pun yang menuntut warga menyebutkannya, jadi dihapus atas
 * permintaan pemilik produk.
 *
 * Gridnya ikut turun dari tiga kolom ke dua. Dengan tiga kolom, dua kartu yang
 * tersisa menyisakan sepertiga lebar kosong di kanan.
 */
const pengguna = {
  id: 4821,
  joinedAt: '12 Agustus 2026',
  lastLogin: '2 November 2026',
};

describe('ProfileAccountCard — tanpa ID Responden', () => {
  it('tidak menampilkan label maupun nilai ID Responden', () => {
    render(<ProfileAccountCard user={pengguna} />);

    expect(screen.queryByText('ID Responden')).toBeNull();
    expect(screen.queryByText('4821')).toBeNull();
  });

  it('tetap menampilkan Tanggal Bergabung dan Login Terakhir', () => {
    render(<ProfileAccountCard user={pengguna} />);

    expect(screen.getByText('Tanggal Bergabung')).toBeInTheDocument();
    expect(screen.getByText('12 Agustus 2026')).toBeInTheDocument();
    expect(screen.getByText('Login Terakhir')).toBeInTheDocument();
    expect(screen.getByText('2 November 2026')).toBeInTheDocument();
  });

  it('dua kartu yang tersisa dibagi dua kolom, bukan tiga', () => {
    render(<ProfileAccountCard user={pengguna} />);

    const grid = screen.getByText('Tanggal Bergabung').closest('.grid');
    expect(grid).toHaveClass('sm:grid-cols-2');
    expect(grid).not.toHaveClass('sm:grid-cols-3');
  });
});
