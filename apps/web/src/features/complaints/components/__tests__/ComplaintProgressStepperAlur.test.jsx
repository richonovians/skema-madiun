import React from 'react';
import { render, screen, within } from '@testing-library/react';
import ComplaintProgressStepper from '../ComplaintProgressStepper';
import { COMPLAINT_ALUR_UTAMA } from '@/utils/enumLabels';

/**
 * Alur lima tahap (4 November 2026, permintaan pengguna), menggantikan tiga
 * tahap lama Diterima -> Diproses -> Selesai.
 *
 * Keadaan tiap tahap dibedakan warna dan ikon, yang tak satu pun terbaca
 * pembaca layar maupun oleh jsdom. Komponennya karena itu menulis keterangan
 * `sr-only` (" — selesai" / " — sedang berjalan" / " — belum dilalui"), dan
 * di sanalah uji ini membacanya.
 */
const tahap = (nama) => screen.getByText(nama).closest('li');
const keadaan = (nama) => {
  const teks = tahap(nama).textContent;
  if (teks.includes('— sedang berjalan')) return 'berjalan';
  if (teks.includes('— selesai')) return 'selesai';
  return 'belum';
};

describe('ComplaintProgressStepper — alur lima tahap', () => {
  it('menggambar kelima tahap, berurutan', () => {
    render(<ComplaintProgressStepper currentStatus="Terkirim" />);

    const butir = within(screen.getByRole('list')).getAllByRole('listitem');
    expect(butir).toHaveLength(5);
    expect(butir.map((b) => b.textContent.split('—')[0].trim())).toEqual(COMPLAINT_ALUR_UTAMA);
  });

  it('menyorot tahap yang sedang berjalan dan menandai yang sudah lewat', () => {
    render(<ComplaintProgressStepper currentStatus="Sedang Ditindaklanjuti" />);

    expect(keadaan('Terkirim')).toBe('selesai');
    expect(keadaan('Menunggu Verifikasi')).toBe('selesai');
    expect(keadaan('Diverifikasi')).toBe('selesai');
    expect(keadaan('Sedang Ditindaklanjuti')).toBe('berjalan');
    expect(keadaan('Selesai')).toBe('belum');
  });

  it('pengaduan baru: Menunggu Verifikasi yang berjalan, Terkirim sudah lewat', () => {
    // Inilah keadaan setiap pengaduan sejak detik ia dikirim.
    render(<ComplaintProgressStepper currentStatus="Menunggu Verifikasi" />);

    expect(keadaan('Terkirim')).toBe('selesai');
    expect(keadaan('Menunggu Verifikasi')).toBe('berjalan');
    expect(keadaan('Diverifikasi')).toBe('belum');
  });

  describe('status alternatif', () => {
    const RIWAYAT_DITOLAK_AWAL = [
      { id: 1, label: 'Terkirim', createdAt: '2026-11-02T02:15:00.000Z' },
      { id: 2, label: 'Ditolak', createdAt: '2026-11-02T06:00:00.000Z' },
    ];
    const RIWAYAT_DITOLAK_AKHIR = [
      { id: 1, label: 'Terkirim', createdAt: '2026-11-02T02:15:00.000Z' },
      { id: 2, label: 'Diverifikasi', createdAt: '2026-11-02T06:00:00.000Z' },
      { id: 3, label: 'Sedang Ditindaklanjuti', createdAt: '2026-11-03T01:00:00.000Z' },
      { id: 4, label: 'Ditolak', createdAt: '2026-11-04T01:00:00.000Z' },
    ];

    it('tidak menyelipkan Ditolak ke dalam kelima tahap', () => {
      // Menyelipkannya akan menyiratkan bahwa tiket yang ditolak toh sedang
      // menuju "Selesai".
      render(
        <ComplaintProgressStepper currentStatus="Ditolak" riwayat={RIWAYAT_DITOLAK_AWAL} />,
      );

      const butir = within(screen.getByRole('list')).getAllByRole('listitem');
      expect(butir).toHaveLength(5);
      expect(butir.map((b) => b.textContent.split('—')[0].trim())).toEqual(COMPLAINT_ALUR_UTAMA);
    });

    it('menjelaskan keadaannya di panel terpisah', () => {
      render(
        <ComplaintProgressStepper currentStatus="Ditolak" riwayat={RIWAYAT_DITOLAK_AWAL} />,
      );

      expect(screen.getByText(/tidak dapat diproses/i)).toBeInTheDocument();
    });

    it('Perlu Perbaikan memberi tahu apa yang harus dilakukan pelapor', () => {
      render(<ComplaintProgressStepper currentStatus="Perlu Perbaikan" riwayat={[]} />);

      expect(screen.getByText(/melengkapi informasi atau bukti/i)).toBeInTheDocument();
    });

    it('alur membeku pada tahap terakhir yang BENAR-BENAR terlampaui', () => {
      // Dua tiket yang sama-sama ditolak berhenti di tempat berbeda, dan hanya
      // riwayatnya yang tahu di mana. Tanpa ini keduanya tergambar sama.
      const { unmount } = render(
        <ComplaintProgressStepper currentStatus="Ditolak" riwayat={RIWAYAT_DITOLAK_AWAL} />,
      );
      expect(keadaan('Terkirim')).toBe('selesai');
      expect(keadaan('Diverifikasi')).toBe('belum');
      unmount();

      render(
        <ComplaintProgressStepper currentStatus="Ditolak" riwayat={RIWAYAT_DITOLAK_AKHIR} />,
      );
      expect(keadaan('Diverifikasi')).toBe('selesai');
      expect(keadaan('Sedang Ditindaklanjuti')).toBe('selesai');
      expect(keadaan('Selesai')).toBe('belum');
    });

    it('tanpa riwayat, tak satu pun tahap digambar berjalan', () => {
      // Daftar pengaduan tak menarik riwayat. Menebak lebih jauh berarti
      // menggambar kemajuan yang mungkin tak pernah terjadi.
      render(<ComplaintProgressStepper currentStatus="Ditolak" />);

      for (const nama of COMPLAINT_ALUR_UTAMA) {
        expect(keadaan(nama)).not.toBe('berjalan');
      }
    });
  });
});
