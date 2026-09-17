import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatReplyForm from '../ChatReplyForm';

/**
 * Kotak balasan di halaman warga. Enter-mengirim sudah ada di ruang kerja admin
 * (AdminResolutionWorkspace) sejak 11 September 2026, tetapi sisi warga
 * terlewat -- padahal justru di sanalah pesan paling sering diketik.
 *
 * Penjagaannya disamakan persis dengan sisi admin: Shift+Enter tetap membuat
 * baris baru, Enter saat aksara sedang disusun papan ketik tidak mengirim, dan
 * pengiriman yang sedang berjalan tak bisa digandakan.
 */
const kotak = () => screen.getByPlaceholderText(/tulis tanggapan anda/i);

const ketik = (teks = 'Terima kasih atas tindak lanjutnya.') => {
  fireEvent.change(kotak(), { target: { value: teks } });
  return kotak();
};

describe('ChatReplyForm — Enter untuk mengirim', () => {
  it('Enter mengirim pesannya', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ChatReplyForm onSubmit={onSubmit} />);

    fireEvent.keyDown(ketik(), { key: 'Enter' });

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit).toHaveBeenCalledWith('Terima kasih atas tindak lanjutnya.', null);
  });

  it('Shift+Enter tidak mengirim, supaya tanggapan panjang tetap bisa berparagraf', () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ChatReplyForm onSubmit={onSubmit} />);

    fireEvent.keyDown(ketik(), { key: 'Enter', shiftKey: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Enter pada kotak kosong tanpa lampiran tidak mengirim apa-apa', () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ChatReplyForm onSubmit={onSubmit} />);

    fireEvent.keyDown(kotak(), { key: 'Enter' });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Enter saat aksara sedang disusun papan ketik tidak mengirim', () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ChatReplyForm onSubmit={onSubmit} />);

    fireEvent.keyDown(ketik(), { key: 'Enter', isComposing: true });

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('Enter berulang selagi pengiriman berjalan tidak mengirim dua kali', async () => {
    let lepaskan;
    const onSubmit = jest.fn(() => new Promise((r) => { lepaskan = r; }));
    render(<ChatReplyForm onSubmit={onSubmit} />);

    const k = ketik();
    fireEvent.keyDown(k, { key: 'Enter' });
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    fireEvent.keyDown(k, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledTimes(1);
    lepaskan();
    await waitFor(() => expect(kotak()).toHaveValue(''));
  });
});

/**
 * TEMPLATE PESAN SISI WARGA (17 September 2026, permintaan pengguna).
 *
 * Yang dijaga di sini bukan panelnya -- itu urusan TemplatePesanPicker.test.jsx
 * -- melainkan dua hal yang hanya bisa salah di sini: kotak ini menawarkan
 * daftar WARGA, dan template yang dipilih tidak menghapus ketikan yang sedang
 * disusun orang.
 */
describe('ChatReplyForm — template pesan', () => {
  const bukaTemplate = () => {
    fireEvent.click(screen.getByRole('button', { name: /template pesan/i }));
  };

  it('menawarkan template warga', () => {
    render(<ChatReplyForm onSubmit={jest.fn()} />);

    bukaTemplate();

    expect(screen.getByText('Menanyakan perkembangan')).toBeInTheDocument();
  });

  /**
   * KONTROL, dan inilah inti permintaan pengguna. Kalimat admin berbicara atas
   * nama instansi ("sudah kami terima"); ia menyesatkan bila dikirim pelapor.
   */
  it('KONTROL: tidak menawarkan satu pun template admin', () => {
    render(<ChatReplyForm onSubmit={jest.fn()} />);

    bukaTemplate();

    expect(screen.queryByText('Pengaduan diterima')).not.toBeInTheDocument();
    expect(screen.queryByText('Diteruskan ke unit lain')).not.toBeInTheDocument();
  });

  it('mengisi kotak yang kosong, lengkap dengan nomor tiketnya', () => {
    render(<ChatReplyForm onSubmit={jest.fn()} nomorTiket="PGD20260917ABCD" />);

    bukaTemplate();
    fireEvent.click(screen.getByText('Menanyakan perkembangan'));

    expect(kotak()).toHaveValue(
      'Mohon informasi perkembangan penanganan pengaduan PGD20260917ABCD. Terima kasih.',
    );
  });

  it('menyambung tanpa menghapus kalimat yang sedang diketik', () => {
    render(<ChatReplyForm onSubmit={jest.fn()} nomorTiket="PGD1" />);
    ketik('Selamat pagi.');

    bukaTemplate();
    fireEvent.click(screen.getByText('Menanyakan perkembangan'));

    expect(kotak()).toHaveValue(
      'Selamat pagi.\nMohon informasi perkembangan penanganan pengaduan PGD1. Terima kasih.',
    );
  });
});
