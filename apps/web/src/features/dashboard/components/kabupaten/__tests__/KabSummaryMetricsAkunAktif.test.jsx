import React from 'react';
import { render, screen } from '@testing-library/react';
import KabSummaryMetrics from '../KabSummaryMetrics';

/**
 * KARTU AKUN AKTIF, ADMIN KABUPATEN (15 September 2026, permintaan pengguna).
 *
 * Sebelumnya strip terpisah di bawah judul "Ringkasan Kinerja Terkini". Kini
 * kartu kelima pada baris ringkasan teratas, sejajar di kanan "Keaktifan
 * Sistem".
 *
 * Angkanya SENGAJA diterima lewat prop tersendiri, bukan diambil dari `data`.
 * Keempat kartu lain berasal dari `GET /dashboard/ikm` yang mengikuti penyaring
 * periode & jenis layanan di navbar, sedangkan jumlah akun berasal dari
 * `GET /statistics` yang tidak. Menyelundupkannya ke dalam `data` akan
 * menyatakan hal yang tidak benar tentang asal angkanya -- dan penyaring yang
 * diubah pengguna tak akan pernah menggesernya.
 */
const data = (over = {}) => ({
  ikmScore: 82.64,
  ikmGrade: null,
  ikmLabel: null,
  totalRespondents: 5,
  openComplaints: 2,
  newComplaints: 1,
  systemActivityPercent: 8.1,
  ...over,
});

const JUDUL_KARTU =
  /^(Rata-Rata IKM Kabupaten|Partisipasi Responden|Total Pengaduan Terbuka|Keaktifan Sistem|Akun Aktif)$/;

describe('KabSummaryMetrics — kartu akun aktif', () => {
  it('berdiri sebagai kartu kelima, sesudah "Keaktifan Sistem"', () => {
    render(<KabSummaryMetrics data={data()} activeUsers={7} />);

    const judul = screen.getAllByText(JUDUL_KARTU).map((el) => el.textContent);

    expect(judul).toEqual([
      'Rata-Rata IKM Kabupaten',
      'Partisipasi Responden',
      'Total Pengaduan Terbuka',
      'Keaktifan Sistem',
      'Akun Aktif',
    ]);
  });

  it('menyebut lingkupnya: seluruh sistem', () => {
    render(<KabSummaryMetrics data={data()} activeUsers={7} />);

    expect(screen.getByText(/di seluruh sistem/i)).toBeInTheDocument();
  });

  /**
   * PASANGAN kontrol terhadap angka yang dipatok di markup -- kegagalan yang
   * tetap menampilkan layar yang tampak wajar.
   */
  it('angkanya datang dari prop, bukan dipatok', () => {
    const { rerender } = render(<KabSummaryMetrics data={data()} activeUsers={7} />);
    expect(screen.getByText('7')).toBeInTheDocument();

    rerender(<KabSummaryMetrics data={data()} activeUsers={19} />);
    expect(screen.getByText('19')).toBeInTheDocument();
  });

  /**
   * `GET /statistics` dan `GET /dashboard/ikm` diambil TERPISAH di halaman itu,
   * jadi keempat kartu lain sudah tergambar ketika jumlah akun belum sampai.
   * "0 akun aktif di seluruh sistem" pada saat itu adalah kabar palsu -- sistem
   * yang sedang dipakai seseorang mustahil bernol.
   */
  it('selagi angkanya belum tiba, kartunya menulis "-" bukan 0', () => {
    render(<KabSummaryMetrics data={data()} activeUsers={null} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
