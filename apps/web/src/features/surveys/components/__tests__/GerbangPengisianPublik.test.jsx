import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import GerbangPengisianPublik from '../GerbangPengisianPublik';

/**
 * GERBANG SEBELUM KUESIONER bagi pengunjung TANPA sesi (8 September 2026,
 * sesudah tim pengguna mengonfirmasi bahwa aplikasi ini memang memerlukan
 * persetujuan UU PDP).
 *
 * Penegakannya BUKAN di sini. `setuju: true` wajib pada
 * `SubmitPublicResponseDto` di backend, dan tanpa itu pengiriman ditolak 400.
 * Yang diuji berkas ini adalah bahwa gerbangnya benar-benar menahan dan
 * benar-benar meneruskan pilihan penggunanya, bukan bahwa ia aman.
 */
const render1 = (props = {}) => render(<GerbangPengisianPublik onSetuju={jest.fn()} {...props} />);

const kotakSetuju = () => screen.getByRole('checkbox', { name: /menyetujui/i });
const kotakTanpaDataDiri = () => screen.getByRole('checkbox', { name: /tanpa data diri/i });
const tombolLanjut = () => screen.getByRole('button', { name: /setuju & mulai isi/i });

/**
 * Nama & nomor HP WAJIB kecuali memilih tanpa data diri (keputusan pengguna
 * 8 September 2026). Pembantu ini mengisi keduanya supaya tiap uji hanya
 * memperlihatkan hal yang sedang diujinya, bukan empat medan yang sama
 * berulang-ulang.
 */
const isiDataDiri = async ({ nama = 'Siti Aminah', nomorHp = '081234567890' } = {}) => {
  fireEvent.change(screen.getByLabelText(/^nama$/i), { target: { value: nama } });
  fireEvent.change(screen.getByLabelText(/nomor hp/i), { target: { value: nomorHp } });
  fireEvent.click(screen.getByLabelText(/jenis kelamin/i));
  fireEvent.click(await screen.findByRole('button', { name: 'Perempuan' }));
  fireEvent.click(screen.getByLabelText(/kelompok umur/i));
  fireEvent.click(await screen.findByRole('button', { name: '26-35' }));
};

describe('GerbangPengisianPublik', () => {
  it('tombol lanjut mati sampai kotak setuju dicentang', () => {
    render1();

    expect(tombolLanjut()).toBeDisabled();

    fireEvent.click(kotakSetuju());

    expect(tombolLanjut()).toBeEnabled();
  });

  it('meneruskan persetujuan & seluruh data diri yang diisi', async () => {
    const onSetuju = jest.fn();
    render1({ onSetuju });

    fireEvent.click(kotakSetuju());
    // Dropdown kustom, bukan <select>: buka dahulu, lalu klik opsinya. Opsinya
    // dirender sebagai <li><button>, jadi dipilih lewat namanya.
    await isiDataDiri();

    fireEvent.click(tombolLanjut());

    expect(onSetuju).toHaveBeenCalledWith({
      setuju: true,
      nama: 'Siti Aminah',
      nomorHp: '081234567890',
      jenisKelamin: 'perempuan',
      kelompokUmur: '26-35',
    });
  });

  it('memilih tanpa data diri menyembunyikan keempat medannya dan mengirim null', () => {
    const onSetuju = jest.fn();
    render1({ onSetuju });

    fireEvent.click(kotakTanpaDataDiri());

    expect(screen.queryByLabelText(/^nama$/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/nomor hp/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/jenis kelamin/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/kelompok umur/i)).not.toBeInTheDocument();

    fireEvent.click(kotakSetuju());
    fireEvent.click(tombolLanjut());

    expect(onSetuju).toHaveBeenCalledWith({
      setuju: true,
      nama: null,
      nomorHp: null,
      jenisKelamin: null,
      kelompokUmur: null,
    });
  });

  it('persetujuan tetap wajib meski memilih tanpa data diri', () => {
    // Inti keputusan pengguna 8 September 2026: yang dilewati opsi itu HANYA
    // formulir data dirinya. Jawaban surveinya tetap diproses, jadi
    // persetujuannya tetap diperlukan.
    render1();

    fireEvent.click(kotakTanpaDataDiri());

    expect(tombolLanjut()).toBeDisabled();
  });

  it('data diri yang diisi lalu dibatalkan tidak ikut terkirim', () => {
    // Menyembunyikan medan tanpa membuang nilainya akan mengirim data yang
    // pengisinya sudah memutuskan untuk tidak diberikan.
    const onSetuju = jest.fn();
    render1({ onSetuju });

    fireEvent.change(screen.getByLabelText(/^nama$/i), { target: { value: 'Budi Santoso' } });
    fireEvent.change(screen.getByLabelText(/nomor hp/i), { target: { value: '081298765432' } });
    fireEvent.click(screen.getByLabelText(/jenis kelamin/i));
    fireEvent.click(screen.getByRole('button', { name: 'Laki-laki' }));
    fireEvent.click(kotakTanpaDataDiri());
    fireEvent.click(kotakSetuju());
    fireEvent.click(tombolLanjut());

    expect(onSetuju).toHaveBeenCalledWith({
      setuju: true,
      nama: null,
      nomorHp: null,
      jenisKelamin: null,
      kelompokUmur: null,
    });
  });

  it('menahan pengiriman & menyebut medan yang kurang bila data diri belum lengkap', async () => {
    // Menolak saat ditekan lalu menunjukkan sebabnya, BUKAN tombol yang mati:
    // tombol mati tak memberi tahu medan mana yang kurang.
    const onSetuju = jest.fn();
    render1({ onSetuju });

    fireEvent.click(kotakSetuju());
    fireEvent.click(tombolLanjut());

    expect(await screen.findByText(/nama wajib diisi/i)).toBeInTheDocument();
    expect(screen.getByText(/nomor hp wajib diisi/i)).toBeInTheDocument();
    expect(screen.getByText(/jenis kelamin wajib dipilih/i)).toBeInTheDocument();
    expect(screen.getByText(/kelompok umur wajib dipilih/i)).toBeInTheDocument();
    expect(onSetuju).not.toHaveBeenCalled();
  });

  it('menolak nomor HP yang bentuknya tidak dikenali', async () => {
    // Bentuknya diperiksa di sini supaya pengisi membaca sebabnya di sebelah
    // medannya sendiri. Penegakan sesungguhnya tetap `@Matches` pada
    // SubmitPublicResponseDto, yang menolak 400.
    const onSetuju = jest.fn();
    render1({ onSetuju });

    fireEvent.click(kotakSetuju());
    await isiDataDiri({ nomorHp: '12345' });
    fireEvent.click(tombolLanjut());

    expect(await screen.findByText(/nomor hp tidak dikenali/i)).toBeInTheDocument();
    expect(onSetuju).not.toHaveBeenCalled();
  });

  it('menerima nomor HP bentuk +62', async () => {
    // KONTROL bagi uji di atas: tanpa ini, penolakan bentuk dapat lulus dengan
    // cara menolak semua nomor.
    const onSetuju = jest.fn();
    render1({ onSetuju });

    fireEvent.click(kotakSetuju());
    await isiDataDiri({ nomorHp: '+6281234567890' });
    fireEvent.click(tombolLanjut());

    expect(onSetuju).toHaveBeenCalledWith(
      expect.objectContaining({ nomorHp: '+6281234567890' }),
    );
  });

  it('ada jalan keluar ke beranda', () => {
    // Persetujuan yang tak punya alternatif selain terjebak bukan persetujuan
    // yang bebas. Alasan yang sama sudah tertulis di ConsentGate.jsx, yang
    // menawarkan "Tidak setuju & keluar" karena ia menghadang sesi; di sini tak
    // ada sesi untuk ditinggalkan, jadi pasangannya beranda.
    render1();

    expect(screen.getByRole('link', { name: /kembali ke beranda/i })).toHaveAttribute('href', '/');
  });

  /**
   * DIBALIK 8 September 2026, bersama permintaan pengguna menambahkan medan nama
   * dan nomor HP. Sebelumnya uji ini menuntut naskahnya berbunyi "tidak diminta
   * nama, email, maupun nomor telepon".
   *
   * Dibalik, bukan dibuang, karena inilah pasangan yang paling penting dijaga:
   * naskah persetujuan yang menyebut lebih sedikit daripada yang sungguh
   * dikumpulkan membatalkan sahnya persetujuan itu sendiri. Uji ini memerah
   * bila medannya kelak berubah tanpa naskahnya menyusul.
   */
  it('naskahnya menyebut dasar hukum & seluruh data yang benar-benar diminta', () => {
    render1();

    expect(screen.getByText(/Nomor 27 Tahun 2022/i)).toBeInTheDocument();
    expect(
      screen.getByText(/nama, nomor HP, jenis kelamin, dan kelompok umur/i),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/tidak diminta nama, email, maupun nomor telepon/i),
    ).not.toBeInTheDocument();
  });
});
