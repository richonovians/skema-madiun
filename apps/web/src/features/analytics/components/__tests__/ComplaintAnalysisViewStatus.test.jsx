import React from 'react';
import { render, screen, within } from '@testing-library/react';
import ComplaintAnalysisView from '../ComplaintAnalysisView';

/**
 * PANEL "DISTRIBUSI STATUS" MENAMPILKAN STATUS (7 Oktober 2026, permintaan
 * pengguna: "tampilkan data di statistic").
 *
 * Panel ini berjudul "Distribusi Status" tetapi sebelumnya menggambar ulang
 * KATEGORI -- bilah yang sama persis dengan donat di sebelahnya -- sehingga data
 * status pengaduan tak pernah tampil di halaman Statistik & Laporan mana pun.
 */
const STATUS = [
  { id: 'diterima', label: 'Diterima', count: 1, percentage: 25, color: '#3b82f6' },
  { id: 'diproses', label: 'Diproses', count: 1, percentage: 25, color: '#f59e0b' },
  { id: 'selesai', label: 'Selesai', count: 2, percentage: 50, color: '#10b981' },
  { id: 'ditolak', label: 'Ditolak', count: 0, percentage: 0, color: '#ef4444' },
];

const sajikan = (props = {}) =>
  render(
    <ComplaintAnalysisView
      categories={[{ name: 'KategoriUnik', count: 4 }]}
      totalComplaints={4}
      resolutionStats={{ averageHours: 5, completionRate: 50, openTickets: 2 }}
      volumeMonthly={[]}
      statusDistribution={STATUS}
      {...props}
    />,
  );

/** Panel diambil lewat judulnya, supaya asersi tak bocor ke donat kategori. */
const panelStatus = () => within(screen.getByText('Distribusi Status').closest('div'));

describe('ComplaintAnalysisView — Distribusi Status', () => {
  it('menggambar keempat status beserta jumlah dan persentasenya', () => {
    sajikan();
    const panel = panelStatus();

    for (const label of ['Diterima', 'Diproses', 'Selesai', 'Ditolak']) {
      expect(panel.getByText(label)).toBeInTheDocument();
    }
    expect(panel.getByText('2 pengaduan (50%)')).toBeInTheDocument();
    expect(panel.getByText('0 pengaduan (0%)')).toBeInTheDocument();
  });

  it('TIDAK lagi menggambar kategori di panel status', () => {
    // Kategori memang tampil di donat sebelah; yang dijaga, panel STATUS tak
    // lagi memuatnya. Inilah cacat aslinya.
    sajikan();

    expect(panelStatus().queryByText('KategoriUnik')).toBeNull();
  });

  it('tanpa data status: pesan jujur, bukan panel kosong atau status karangan', () => {
    sajikan({ statusDistribution: null });

    expect(panelStatus().getByText('Belum ada data status.')).toBeInTheDocument();
  });

  it('keempat status selalu digambar walau jumlahnya nol (urutan alur terjaga)', () => {
    sajikan();

    const urutan = panelStatus()
      .getAllByText(/^(Diterima|Diproses|Selesai|Ditolak)$/)
      .map((el) => el.textContent);

    expect(urutan).toEqual(['Diterima', 'Diproses', 'Selesai', 'Ditolak']);
  });
});
