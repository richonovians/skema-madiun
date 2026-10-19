import React from 'react';
import { render, screen } from '@testing-library/react';
import ComplaintDetailHeader from '../ComplaintDetailHeader';

/**
 * JUDUL DI BAWAH NOMOR TIKET DIHAPUS (permintaan pengguna 22 September 2026).
 *
 * Judulnya tidak hilang dari halaman: ia turun ke kartu "Isi Pengaduan" dengan
 * label "Judul Pengaduan" di sebelahnya, tempat ia berpasangan dengan uraian
 * yang menjelaskannya. Di kepala halaman ia hanya mengulang apa yang sudah
 * terbaca beberapa sentimeter di bawahnya.
 *
 * Yang TETAP di kepala adalah nomor tiket dan lencana status -- dua hal yang
 * dicari orang saat menyalin nomor aduan atau memastikan tiketnya masih
 * berjalan.
 */
jest.mock('@/features/complaints/components/ComplaintExportMenu', () => ({
  __esModule: true,
  default: () => <div data-testid="menu-ekspor" />,
}));

const pengaduan = (over = {}) => ({
  id: 'PGD20260916CGAO',
  numericId: 9,
  title: 'tes12345',
  description: 'Uraian panjang.',
  status: 'Diproses',
  dateStr: '16 Sep 2026',
  target: 'Dinas Komunikasi dan Informatika',
  kategori: 'aduan',
  reporter: { name: 'Budi', initials: 'B' },
  attachments: [],
  ...over,
});

describe('ComplaintDetailHeader', () => {
  it('TIDAK lagi menampilkan judul pengaduan di bawah nomor tiket', () => {
    render(<ComplaintDetailHeader complaint={pengaduan()} chatHistory={[]} />);

    expect(screen.queryByText('tes12345')).not.toBeInTheDocument();
  });

  /**
   * KONTROL. Tanpa ini, kepala yang gagal dirender sama sekali -- atau yang
   * kehilangan nomor tiketnya sekalian -- akan membuat uji di atas hijau
   * selamanya.
   */
  it('KONTROL: nomor tiket dan lencana status tetap ada', () => {
    render(<ComplaintDetailHeader complaint={pengaduan()} chatHistory={[]} />);

    expect(screen.getByText('#PGD20260916CGAO')).toBeInTheDocument();
    expect(screen.getByText('Diproses')).toBeInTheDocument();
  });

  /**
   * KONTROL kedua: judul yang kebetulan sama dengan nomor tiket akan membuat
   * uji pertama menipu. Judul yang khas membuktikan yang dicari benar-benar
   * judulnya.
   */
  it('KONTROL: judul apa pun bentuknya tetap tak dirender di kepala', () => {
    render(<ComplaintDetailHeader complaint={pengaduan({ title: 'Lampu jalan mati total' })} chatHistory={[]} />);

    expect(screen.queryByText('Lampu jalan mati total')).not.toBeInTheDocument();
    expect(screen.getByText('#PGD20260916CGAO')).toBeInTheDocument();
  });
});
