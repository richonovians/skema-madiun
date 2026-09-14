import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatMessageList from '../chat/ChatMessageList';
import ChatReplyForm from '../chat/ChatReplyForm';

/**
 * TC-FE-040 — Percakapan pengaduan.
 *
 * Kerusakan yang ditangkap:
 *  - keberpihakan pesan tertukar. `ChatMessageBubble` memakai
 *    `senderRole = 'user'` sebagai nilai bawaan, jadi peran yang gagal
 *    diteruskan membuat balasan ADMIN tampil sebagai pesan warga sendiri —
 *    warga bisa mengira tanggapan resmi itu tulisannya sendiri;
 *  - tombol kirim aktif meski tak ada isi apa pun, menghasilkan balasan kosong;
 *  - balasan berlampiran tanpa teks ditolak. Ini pernah menjadi cacat nyata
 *    (laporan pengguna 6 Agustus 2026: "kirim foto tanpa teks tidak terkirim");
 *  - teks yang sudah diketik hilang saat pengiriman gagal.
 */

/**
 * CATATAN 15 September 2026. Berkas ini dulu membuka dengan empat kasus atas
 * `adaptComplaintReplyToChatMessage`. Keempatnya DIBUANG, bukan diperbaiki:
 * `complaint.adapter.test.js` (milik tim dev) kini menguji adapter yang sama
 * lebih dalam — termasuk label pelapor anonim dan akun pelapor yang menjawab
 * sebagai petugas — dan menduakan cakupan hanya menggandakan biaya perawatan.
 * Yang tersisa di sini adalah dua permukaan yang belum diuji siapa pun:
 * `ChatMessageList` dan sisi `ChatReplyForm` di luar tombol Enter.
 */

describe('ChatMessageList (TC-FE-040)', () => {
  it('membedakan pesan warga dari balasan admin', () => {
    render(
      <ChatMessageList
        messages={[
          { type: 'chat', role: 'user', text: 'Jalan di depan rumah rusak.', timestamp: '07.00 WIB', status: 'Terkirim' },
          { type: 'chat', role: 'admin', senderName: 'Admin', text: 'Laporan Anda kami proses.', timestamp: '07.05 WIB' },
        ]}
      />,
    );

    expect(screen.getByText('Jalan di depan rumah rusak.')).toBeInTheDocument();
    expect(screen.getByText('Laporan Anda kami proses.')).toBeInTheDocument();

    // Hanya balasan admin yang berlabel nama pengirim; pesan warga tidak.
    expect(screen.getByText('Admin')).toBeInTheDocument();
    // Penanda "Terkirim" hanya melekat pada pesan warga sendiri.
    expect(screen.getByText(/Terkirim/)).toBeInTheDocument();
  });

  it('merender pesan sistem sebagai keterangan, bukan gelembung percakapan', () => {
    render(
      <ChatMessageList
        messages={[{ type: 'system', text: 'Status pengaduan diubah menjadi Diproses' }]}
      />,
    );

    expect(screen.getByText('Status pengaduan diubah menjadi Diproses')).toBeInTheDocument();
    // Keterangan sistem tak berpengirim dan tak berstatus kirim.
    expect(screen.queryByText('Admin')).not.toBeInTheDocument();
    expect(screen.queryByText(/Terkirim/)).not.toBeInTheDocument();
  });
});

describe('ChatReplyForm (TC-FE-040)', () => {
  const tombolKirim = () => screen.getByRole('button', { name: /kirim pesan/i });
  const kolomTeks = () => screen.getByPlaceholderText('Tulis tanggapan Anda di sini...');

  it('mengunci tombol kirim selama tak ada teks maupun lampiran', () => {
    render(<ChatReplyForm onSubmit={jest.fn()} />);

    expect(tombolKirim()).toBeDisabled();

    fireEvent.change(kolomTeks(), { target: { value: '   ' } });
    // Spasi saja bukan isi.
    expect(tombolKirim()).toBeDisabled();

    fireEvent.change(kolomTeks(), { target: { value: 'Sudah diperbaiki?' } });
    expect(tombolKirim()).toBeEnabled();
  });

  it('meneruskan teks dan lampiran apa adanya lalu mengosongkan kolom', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    render(<ChatReplyForm onSubmit={onSubmit} />);

    fireEvent.change(kolomTeks(), { target: { value: 'Sudah diperbaiki?' } });
    fireEvent.click(tombolKirim());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('Sudah diperbaiki?', null));
    await waitFor(() => expect(kolomTeks()).toHaveValue(''));
  });

  it('mengizinkan balasan berlampiran tanpa teks', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined);
    const { container } = render(<ChatReplyForm onSubmit={onSubmit} />);

    const berkas = new File(['isi'], 'bukti.png', { type: 'image/png' });
    fireEvent.change(container.querySelector('input[type="file"]'), {
      target: { files: [berkas] },
    });

    // Tanpa satu huruf pun di kolom teks, tombolnya harus tetap aktif —
    // inilah cacat yang dilaporkan pengguna pada 6 Agustus 2026.
    await waitFor(() => expect(tombolKirim()).toBeEnabled());
    fireEvent.click(tombolKirim());

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('', berkas));
  });

  it('mempertahankan teks ketika pengiriman gagal', async () => {
    const onSubmit = jest.fn().mockRejectedValue(new Error('jaringan putus'));
    render(<ChatReplyForm onSubmit={onSubmit} />);

    fireEvent.change(kolomTeks(), { target: { value: 'Tanggapan panjang yang sayang kalau hilang' } });
    fireEvent.click(tombolKirim());

    await waitFor(() => expect(onSubmit).toHaveBeenCalled());
    // Menghapusnya berarti pengguna harus mengetik ulang seluruhnya.
    await waitFor(() =>
      expect(kolomTeks()).toHaveValue('Tanggapan panjang yang sayang kalau hilang'),
    );
    expect(tombolKirim()).toBeEnabled();
  });
});
