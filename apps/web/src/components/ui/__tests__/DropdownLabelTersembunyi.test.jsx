import React from 'react';
import { render, screen } from '@testing-library/react';
import Dropdown from '../Dropdown';

/**
 * LABEL TERSEMBUNYI, BUKAN LABEL DIBUANG (6 Oktober 2026, permintaan pengguna:
 * "perbaiki posisi teks tahun dan triwulan").
 *
 * `Dropdown` menggambar labelnya sebagai blok DI ATAS kontrolnya. Di navbar,
 * tetangga penyaring periode tak berlabel, sehingga kedua dropdown terdorong
 * turun dan menonjol keluar dari tinggi bilah -- judul halaman ikut terhimpit.
 *
 * Yang TIDAK boleh dilakukan: membuang `label`-nya. Nama aksesibel kontrol ini
 * satu-satunya berasal dari sana; tanpa itu pembaca layar hanya mengumumkan
 * "2026" dan "Semua Triwulan" tanpa memberi tahu keduanya penyaring apa.
 * Karena itu labelnya `sr-only`: hilang dari layar, utuh bagi pembaca layar.
 *
 * Uji pertama adalah KONTROL. `Dropdown` dipakai puluhan tempat dengan label
 * tampak; tanpa kontrol itu, menyembunyikan label SELURUH aplikasi tak akan
 * memerahkan apa pun.
 */
const OPSI = [
  { value: '2026', label: '2026' },
  { value: '2025', label: '2025' },
];

const sajikan = (props = {}) =>
  render(
    <Dropdown label="Tahun" id="tahun" options={OPSI} value="2026" onChange={jest.fn()} {...props} />,
  );

describe('Dropdown — labelTersembunyi', () => {
  it('KONTROL: tanpa prop itu, label tetap blok yang tampak', () => {
    const { container } = sajikan();

    const label = container.querySelector('label[for="tahun"]');

    expect(label).toHaveClass('block');
    expect(label).not.toHaveClass('sr-only');
  });

  it('dengan labelTersembunyi, label menjadi sr-only', () => {
    const { container } = sajikan({ labelTersembunyi: true });

    const label = container.querySelector('label[for="tahun"]');

    expect(label).toHaveClass('sr-only');
    expect(label).not.toHaveClass('block');
  });

  it('nama aksesibel kontrolnya TETAP utuh saat labelnya tersembunyi', () => {
    // Ini yang membedakan "disembunyikan" dari "dibuang". Uji ini tetap hijau
    // kalau labelnya dihapus sama sekali? Tidak: getByLabelText akan gagal.
    sajikan({ labelTersembunyi: true });

    expect(screen.getByLabelText('Tahun')).toBeInTheDocument();
  });

  it('tak menyisakan jarak milik label yang sudah tak menempati ruang', () => {
    // `space-y-1` memberi margin-atas 4px pada anak KEDUA -- tombol pemicunya.
    // Label `sr-only` itu `position: absolute`, jadi ia tak lagi menempati
    // ruang, tetapi marginnya tetap ada: dropdown ini turun 4px dari
    // tetangganya yang tak berlabel. Persis cacat yang hendak diperbaiki,
    // hanya lebih kecil.
    const { container } = sajikan({ labelTersembunyi: true });

    expect(container.firstChild).not.toHaveClass('space-y-1');
  });
});
