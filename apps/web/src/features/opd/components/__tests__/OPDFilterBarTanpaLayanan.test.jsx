import React from 'react';
import { render, screen } from '@testing-library/react';
import OPDFilterBar from '../OPDFilterBar';

/**
 * PENYARING JENIS LAYANAN DIBUANG (15 September 2026, permintaan pengguna),
 * seiring kolomnya yang juga hilang dari tabel. Menyisakan penyaring untuk
 * kolom yang tak lagi tampil hanya menyembunyikan baris tanpa sebab yang
 * terlihat di layar.
 *
 * Opsi layanan SENGAJA tetap dioper dalam uji ini. Komponen yang hanya berhenti
 * menerima propnya, tetapi masih menggambar dropdown-nya dari sumber lain, akan
 * lolos uji yang tak mengirim apa-apa.
 */
const pasang = () =>
  render(
    <OPDFilterBar
      searchQuery=""
      setSearchQuery={() => {}}
      selectedService=""
      setSelectedService={() => {}}
      serviceOptions={[
        { value: '', label: 'Semua Jenis Layanan' },
        { value: 'Kesehatan', label: 'Kesehatan' },
      ]}
      onReset={() => {}}
    />,
  );

describe('OPDFilterBar — tanpa penyaring layanan', () => {
  it('tidak lagi memuat dropdown jenis layanan', () => {
    pasang();

    expect(screen.queryByText(/semua jenis layanan/i)).toBeNull();
  });

  /**
   * PASANGAN kontrol. Bilah yang gagal dirender juga lolos uji di atas, dan
   * bersamanya hilang pencarian -- satu-satunya cara menemukan OPD tertentu di
   * antara 62 baris.
   */
  it('KONTROL: pencarian dan tombol reset tetap ada', () => {
    pasang();

    expect(screen.getByPlaceholderText(/cari berdasarkan nama opd/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });
});
