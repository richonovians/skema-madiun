import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import OPDFilterBar from '../OPDFilterBar';

/**
 * PENYARING JENIS LAYANAN DIBUANG (15 September 2026, permintaan pengguna),
 * seiring kolomnya yang juga hilang dari tabel. Menyisakan penyaring untuk
 * kolom yang tak lagi tampil hanya menyembunyikan baris tanpa sebab yang
 * terlihat di layar.
 *
 * Tombol "Reset Filter" DIBUANG (21 September 2026, permintaan pengguna) --
 * diganti ikon X di dalam search bar.
 */
const pasang = (searchQuery = '', setSearchQuery = () => {}) =>
  render(
    <OPDFilterBar
      searchQuery={searchQuery}
      setSearchQuery={setSearchQuery}
    />,
  );

describe('OPDFilterBar — tanpa penyaring layanan', () => {
  it('tidak lagi memuat dropdown jenis layanan', () => {
    pasang();

    expect(screen.queryByText(/semua jenis layanan/i)).toBeNull();
  });

  it('tidak lagi memuat tombol reset terpisah', () => {
    pasang();

    expect(screen.queryByRole('button', { name: /reset/i })).toBeNull();
  });

  /**
   * PASANGAN kontrol. Bilah yang gagal dirender juga lolos uji di atas, dan
   * bersamanya hilang pencarian -- satu-satunya cara menemukan OPD tertentu di
   * antara 62 baris.
   */
  it('KONTROL: input pencarian tetap ada', () => {
    pasang();

    expect(screen.getByPlaceholderText(/cari berdasarkan nama opd/i)).toBeInTheDocument();
  });

  it('menampilkan tombol hapus (X) hanya saat ada teks pencarian', () => {
    pasang('Dinas Kesehatan');

    expect(screen.getByRole('button', { name: /hapus pencarian/i })).toBeInTheDocument();
  });

  it('tidak menampilkan tombol hapus (X) saat pencarian kosong', () => {
    pasang('');

    expect(screen.queryByRole('button', { name: /hapus pencarian/i })).toBeNull();
  });

  it('memanggil setSearchQuery dengan string kosong saat tombol X diklik', () => {
    const setSearchQuery = jest.fn();
    pasang('Dinas Pendidikan', setSearchQuery);

    fireEvent.click(screen.getByRole('button', { name: /hapus pencarian/i }));

    expect(setSearchQuery).toHaveBeenCalledWith('');
  });
});
