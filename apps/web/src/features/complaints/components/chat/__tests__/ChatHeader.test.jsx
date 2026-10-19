import React from 'react';
import { render, screen } from '@testing-library/react';
import ChatHeader from '../ChatHeader';

/**
 * JUDUL PENGADUAN DI KEPALA PERCAKAPAN (22 September 2026, permintaan pengguna).
 *
 * Kepala ini dulu berbunyi "Riwayat Interaksi" dengan anak judul "Diskusi aktif
 * dengan petugas lapangan" -- dua kalimat yang sama pada setiap tiket, sehingga
 * ruang yang sudah terpakai itu tak memberi tahu apa pun. Judul pengaduannya
 * ditaruh di sini justru karena ruangnya SUDAH ada: ia tidak menambah tinggi
 * panel, dan tinggi panel itulah yang sedang diperebutkan pada layar sempit.
 *
 * Sisi Admin OPD SENGAJA tidak diberi kepala serupa. Terukur: kepala setinggi
 * ~56px akan menekan porsi percakapannya di ponsel menjadi 51%, di bawah ambang
 * 55% yang dijaga uji Playwright. Di sana judulnya sudah tampil pada kartu "Isi
 * Pengaduan" di halaman yang sama.
 */
describe('ChatHeader', () => {
  it('menampilkan judul pengaduan sebagai tajuk percakapan', () => {
    render(<ChatHeader judulPengaduan="Jalan berlubang di depan kantor desa" />);

    expect(
      screen.getByRole('heading', { name: 'Jalan berlubang di depan kantor desa' }),
    ).toBeInTheDocument();
  });

  /**
   * Tanpa judul, kepalanya kembali ke bunyi lamanya. Tiket lama yang judulnya
   * tak terbawa tak boleh menghasilkan tajuk kosong.
   */
  it('tanpa judul pengaduan: memakai bunyi lama, bukan tajuk kosong', () => {
    render(<ChatHeader />);

    const tajuk = screen.getByRole('heading');
    expect(tajuk.textContent.trim()).not.toBe('');
    expect(tajuk).toHaveTextContent(/riwayat interaksi/i);
  });

  /**
   * KONTROL: kepala yang berhenti merender peserta percakapan akan tetap
   * membuat kedua uji di atas hijau.
   */
  it('KONTROL: avatar peserta tetap dirender', () => {
    const { container } = render(
      <ChatHeader judulPengaduan="Jalan rusak" participants={[{ initials: 'AB' }]} />,
    );

    expect(container.textContent).toContain('AB');
  });
});
