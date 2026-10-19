import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import TemplatePesanPicker from '../TemplatePesanPicker';

/**
 * Pemilih template pesan (17 September 2026, permintaan pengguna).
 *
 * Komponennya sengaja tak tahu siapa yang memakainya: daftar template dioper
 * pemanggil, sehingga kotak warga dan ruang kerja admin memakai komponen yang
 * sama tanpa satu pun percabangan peran di dalamnya. Yang menjaga kedua daftar
 * itu tak tertukar adalah uji pada masing-masing kotak pesan, bukan di sini.
 */
const CONTOH = [
  { id: 'a', judul: 'Menanyakan perkembangan', isi: 'Mohon informasi pengaduan {tiket}.' },
  { id: 'b', judul: 'Masalah sudah teratasi', isi: 'Pengaduan {tiket} sudah teratasi.' },
];

const tombol = () => screen.getByRole('button', { name: /template pesan/i });

describe('TemplatePesanPicker', () => {
  it('menyembunyikan daftarnya sampai tombolnya ditekan', () => {
    render(<TemplatePesanPicker templates={CONTOH} onPilih={jest.fn()} />);

    expect(screen.queryByText('Menanyakan perkembangan')).not.toBeInTheDocument();

    fireEvent.click(tombol());

    expect(screen.getByText('Menanyakan perkembangan')).toBeInTheDocument();
    expect(screen.getByText('Masalah sudah teratasi')).toBeInTheDocument();
  });

  it('menyerahkan teks yang nomor tiketnya sudah terisi, lalu menutup daftarnya', () => {
    const onPilih = jest.fn();
    render(
      <TemplatePesanPicker templates={CONTOH} nomorTiket="PGD20260917ABCD" onPilih={onPilih} />,
    );

    fireEvent.click(tombol());
    fireEvent.click(screen.getByText('Menanyakan perkembangan'));

    expect(onPilih).toHaveBeenCalledWith('Mohon informasi pengaduan PGD20260917ABCD.');
    expect(screen.queryByText('Masalah sudah teratasi')).not.toBeInTheDocument();
  });

  /**
   * Panel yang hanya bisa ditutup dengan memilih salah satu isinya memaksa
   * orang mengirim kalimat yang tak ia inginkan. Esc dan klik di luar adalah
   * dua jalan keluar yang sama-sama sudah menjadi kebiasaan.
   */
  it('menutup daftarnya saat Esc ditekan', () => {
    render(<TemplatePesanPicker templates={CONTOH} onPilih={jest.fn()} />);

    fireEvent.click(tombol());
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(screen.queryByText('Menanyakan perkembangan')).not.toBeInTheDocument();
  });

  it('menutup daftarnya saat diklik di luar panel', () => {
    render(
      <div>
        <TemplatePesanPicker templates={CONTOH} onPilih={jest.fn()} />
        <button type="button">Di luar</button>
      </div>,
    );

    fireEvent.click(tombol());
    fireEvent.mouseDown(screen.getByRole('button', { name: 'Di luar' }));

    expect(screen.queryByText('Menanyakan perkembangan')).not.toBeInTheDocument();
  });

  it('menyebutkan keadaan terbuka pada tombolnya, bukan hanya lewat rupa panel', () => {
    render(<TemplatePesanPicker templates={CONTOH} onPilih={jest.fn()} />);

    expect(tombol()).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(tombol());

    expect(tombol()).toHaveAttribute('aria-expanded', 'true');
  });
});
