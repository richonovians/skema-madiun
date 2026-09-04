import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatMessageList from '../chat/ChatMessageList';
import ChatReplyForm from '../chat/ChatReplyForm';
import { adaptComplaintReplyToChatMessage } from '../../adapters/complaint.adapter';

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

describe('adaptComplaintReplyToChatMessage (TC-FE-040)', () => {
  const ID_PELAPOR = 23;
  const balasan = (over = {}) => ({
    id: 1,
    authorId: ID_PELAPOR,
    pesan: 'Terima kasih atas laporannya.',
    createdAt: '2026-09-02T07:05:00.000Z',
    ...over,
  });

  it('menandai balasan pelapor sebagai pesan warga tanpa nama pengirim', () => {
    const pesan = adaptComplaintReplyToChatMessage(balasan(), ID_PELAPOR);

    expect(pesan.role).toBe('user');
    // Nama pengirim sengaja kosong: warga tak perlu diberi label atas pesannya sendiri.
    expect(pesan.senderName).toBeUndefined();
  });

  it('menandai balasan bukan-pelapor sebagai admin', () => {
    const pesan = adaptComplaintReplyToChatMessage(balasan({ authorId: 99 }), ID_PELAPOR);

    expect(pesan.role).toBe('admin');
    // Label generik "Admin", bukan "Admin OPD": backend tak mengirim peran
    // penulis, jadi menyebut peran tertentu berarti mengarang. Lihat CAT-005.
    expect(pesan.senderName).toBe('Admin');
  });

  it('membawa teks, waktu berzona WIB, dan status terkirim', () => {
    const pesan = adaptComplaintReplyToChatMessage(balasan(), ID_PELAPOR);

    expect(pesan.text).toBe('Terima kasih atas laporannya.');
    expect(pesan.timestamp).toMatch(/^\d{2}[.:]\d{2} WIB$/);
    expect(pesan.status).toBe('Terkirim');
  });

  it('tidak menampilkan waktu palsu ketika backend tak mengirim tanggal', () => {
    const pesan = adaptComplaintReplyToChatMessage(balasan({ createdAt: null }), ID_PELAPOR);

    // Kosong, bukan "Invalid Date" atau waktu sekarang yang mengarang.
    expect(pesan.timestamp).toBe('');
  });
});

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
