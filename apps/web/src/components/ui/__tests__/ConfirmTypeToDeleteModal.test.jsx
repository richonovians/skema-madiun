import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ConfirmTypeToDeleteModal from '../ConfirmTypeToDeleteModal';

/**
 * Konfirmasi bagi tindakan yang TAK DAPAT DIBATALKAN (penghapusan permanen dari
 * halaman Sampah, 11 September 2026). Satu klik memadai untuk yang masih bisa
 * dipulihkan; yang membawa serta jawaban responden tidak.
 */
const render1 = (props = {}) =>
  render(
    <ConfirmTypeToDeleteModal
      isOpen
      judul="Hapus Survei Permanen"
      deskripsi="12 jawaban akan hilang selamanya."
      teksKonfirmasi="Survei IKM 2026"
      onConfirm={jest.fn()}
      onCancel={jest.fn()}
      {...props}
    />,
  );

describe('ConfirmTypeToDeleteModal', () => {
  it('tombolnya mati sampai judulnya diketik persis', () => {
    render1();
    const tombol = screen.getByRole('button', { name: /hapus permanen/i });

    expect(tombol).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Survei IKM' } });
    expect(tombol).toBeDisabled();

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Survei IKM 2026' } });
    expect(tombol).toBeEnabled();
  });

  it('meneruskan konfirmasinya hanya sekali ditekan', () => {
    const onConfirm = jest.fn();
    render1({ onConfirm });

    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Survei IKM 2026' } });
    fireEvent.click(screen.getByRole('button', { name: /hapus permanen/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('menampilkan akibatnya, bukan cuma bertanya yakin atau tidak', () => {
    render1();

    expect(screen.getByText(/12 jawaban akan hilang selamanya/i)).toBeInTheDocument();
  });

  it('ketikan tidak tertinggal saat dialognya dibuka kembali', () => {
    // Dialog yang terbuka dengan tombol yang sudah hidup dari ketikan
    // sebelumnya menghapus seluruh gunanya penjaga ini -- terlebih karena
    // sasarannya berbeda tiap kali dibuka.
    const { rerender } = render1();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Survei IKM 2026' } });

    rerender(
      <ConfirmTypeToDeleteModal
        isOpen={false}
        judul="Hapus Survei Permanen"
        deskripsi="12 jawaban akan hilang selamanya."
        teksKonfirmasi="Survei IKM 2026"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );
    rerender(
      <ConfirmTypeToDeleteModal
        isOpen
        judul="Hapus Survei Permanen"
        deskripsi="40 jawaban akan hilang selamanya."
        teksKonfirmasi="Survei Lain"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByRole('textbox')).toHaveValue('');
    expect(screen.getByRole('button', { name: /hapus permanen/i })).toBeDisabled();
  });
});
