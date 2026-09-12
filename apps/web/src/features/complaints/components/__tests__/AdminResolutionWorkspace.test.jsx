import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import AdminResolutionWorkspace from '../AdminResolutionWorkspace';

/**
 * Ruang solusi admin: percakapan dengan pelapor, ditambah satu tindakan yang
 * tak dapat dibatalkan (menutup tiket) di kolom yang sama.
 *
 * Yang dikunci di sini adalah pemisahan keduanya (11 September 2026, laporan
 * salah klik). Menutup tiket dan mengirim pesan sebelumnya bertetangga di ujung
 * kanan, dan yang menonjol justru yang jarang ditekan.
 */
const tombolKirim = () => screen.getByRole('button', { name: /kirim pesan|mengirim/i });
const tombolSelesai = () => screen.getByRole('button', { name: /selesaikan pengaduan/i });

describe('AdminResolutionWorkspace', () => {
  it('tombol penutup tiket mendahului tombol kirim, bukan bertetangga di ujung kanan', () => {
    // Urutan DOM menentukan dua hal sekaligus: di layar lebar tombol penutup
    // terdorong ke ujung kiri, dan di layar sempit -- tempat keduanya bertumpuk
    // -- ia berada paling jauh dari ibu jari.
    render(<AdminResolutionWorkspace currentStatus="Diproses" onSendUpdate={jest.fn()} />);

    const posisi = tombolSelesai().compareDocumentPosition(tombolKirim());
    expect(posisi & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('penutup tiket hanya ditawarkan saat tiket berstatus Diproses', () => {
    // Backend hanya mengizinkan Diproses -> Selesai; menawarkannya pada status
    // lain berarti menjanjikan yang pasti ditolak 400.
    const { rerender } = render(
      <AdminResolutionWorkspace currentStatus="Diterima" onSendUpdate={jest.fn()} />,
    );
    expect(screen.queryByRole('button', { name: /selesaikan pengaduan/i })).not.toBeInTheDocument();

    rerender(<AdminResolutionWorkspace currentStatus="Diproses" onSendUpdate={jest.fn()} />);
    expect(tombolSelesai()).toBeInTheDocument();
  });

  it('tombol kirim mati selagi pesan dikirim, supaya tak terkirim dua kali', async () => {
    let lepaskan;
    const onSendUpdate = jest.fn(
      () =>
        new Promise((resolve) => {
          lepaskan = resolve;
        }),
    );
    render(<AdminResolutionWorkspace currentStatus="Diproses" onSendUpdate={onSendUpdate} />);

    fireEvent.change(screen.getByPlaceholderText(/tulis jawaban solusi/i), {
      target: { value: 'Sudah kami tindak lanjuti.' },
    });
    fireEvent.click(tombolKirim());

    await waitFor(() => expect(tombolKirim()).toBeDisabled());

    lepaskan();
    await waitFor(() => expect(tombolKirim()).toBeEnabled());
    expect(onSendUpdate).toHaveBeenCalledTimes(1);
  });
  describe('Enter untuk mengirim', () => {
    const ketik = (teks = 'Sudah kami tindak lanjuti.') => {
      const kotak = screen.getByPlaceholderText(/tulis jawaban solusi/i);
      fireEvent.change(kotak, { target: { value: teks } });
      return kotak;
    };

    it('Enter mengirim pesannya', async () => {
      const onSendUpdate = jest.fn().mockResolvedValue(undefined);
      render(<AdminResolutionWorkspace currentStatus="Diproses" onSendUpdate={onSendUpdate} />);

      fireEvent.keyDown(ketik(), { key: 'Enter' });

      await waitFor(() => expect(onSendUpdate).toHaveBeenCalledTimes(1));
      expect(onSendUpdate).toHaveBeenCalledWith('Sudah kami tindak lanjuti.', null);
    });

    it('Shift+Enter tidak mengirim, supaya balasan panjang tetap bisa berparagraf', () => {
      const onSendUpdate = jest.fn().mockResolvedValue(undefined);
      render(<AdminResolutionWorkspace currentStatus="Diproses" onSendUpdate={onSendUpdate} />);

      fireEvent.keyDown(ketik(), { key: 'Enter', shiftKey: true });

      expect(onSendUpdate).not.toHaveBeenCalled();
    });

    it('Enter pada kotak kosong tidak mengirim apa-apa', () => {
      const onSendUpdate = jest.fn().mockResolvedValue(undefined);
      render(<AdminResolutionWorkspace currentStatus="Diproses" onSendUpdate={onSendUpdate} />);

      fireEvent.keyDown(screen.getByPlaceholderText(/tulis jawaban solusi/i), { key: 'Enter' });

      expect(onSendUpdate).not.toHaveBeenCalled();
    });

    it('Enter saat aksara sedang disusun papan ketik tidak mengirim', () => {
      // Papan ketik beraksara majemuk memakai Enter untuk MEMILIH calon aksara.
      // Tanpa penjagaan ini, pemilihan itu ikut mengirim pesan yang belum jadi.
      const onSendUpdate = jest.fn().mockResolvedValue(undefined);
      render(<AdminResolutionWorkspace currentStatus="Diproses" onSendUpdate={onSendUpdate} />);

      fireEvent.keyDown(ketik(), { key: 'Enter', isComposing: true });

      expect(onSendUpdate).not.toHaveBeenCalled();
    });

    it('Enter berulang selagi pengiriman berjalan tidak mengirim dua kali', async () => {
      let lepaskan;
      const onSendUpdate = jest.fn(() => new Promise((r) => { lepaskan = r; }));
      render(<AdminResolutionWorkspace currentStatus="Diproses" onSendUpdate={onSendUpdate} />);

      const kotak = ketik();
      fireEvent.keyDown(kotak, { key: 'Enter' });
      await waitFor(() => expect(onSendUpdate).toHaveBeenCalledTimes(1));
      fireEvent.keyDown(kotak, { key: 'Enter' });

      expect(onSendUpdate).toHaveBeenCalledTimes(1);
      lepaskan();
      await waitFor(() => expect(tombolKirim()).toBeEnabled());
    });
  });
});
