import React from 'react';
import { render, screen, within } from '@testing-library/react';
import SurveyMonitoringTable from '../SurveyMonitoringTable';

/**
 * TOMBOL BAGIKAN HANYA PADA SURVEI AKTIF (permintaan pengguna 22 September
 * 2026), sisi Admin Kabupaten.
 *
 * Aturannya sama persis dengan kartu Admin OPD, tetapi diuji terpisah di sini
 * karena tabel ini merender tombolnya sendiri. Satu uji di salah satu area saja
 * akan membiarkan area lain membocorkan tautan survei yang belum terbit tanpa
 * ada yang memerah.
 */
const survei = (id, title, status) => ({
  id: String(id),
  title,
  status,
  period: '2026-Q3',
  opdName: 'Dinas Contoh',
  respondentsCount: 0,
  ikmScore: null,
});

const render1 = (surveys) =>
  render(
    <SurveyMonitoringTable
      surveys={surveys}
      onEdit={jest.fn()}
      onPublish={jest.fn()}
      onClose={jest.fn()}
      onReopen={jest.fn()}
      onDelete={jest.fn()}
      onDuplicate={jest.fn()}
    />,
  );

/** Baris dicari lewat judulnya supaya asersinya tak bergantung pada urutan. */
const baris = (judul) => screen.getByText(judul).closest('tr');

describe('SurveyMonitoringTable — tombol Bagikan mengikuti status', () => {
  it('menampilkan Bagikan pada survei AKTIF', () => {
    render1([survei(1, 'Survei Aktif', 'AKTIF')]);

    expect(within(baris('Survei Aktif')).getByRole('button', { name: /bagikan/i })).toBeInTheDocument();
  });

  it('menyembunyikan Bagikan pada survei DRAF', () => {
    render1([survei(2, 'Survei Draf', 'DRAF')]);

    expect(within(baris('Survei Draf')).queryByRole('button', { name: /bagikan/i })).not.toBeInTheDocument();
  });

  it('menyembunyikan Bagikan pada survei DITUTUP', () => {
    render1([survei(3, 'Survei Ditutup', 'DITUTUP')]);

    expect(
      within(baris('Survei Ditutup')).queryByRole('button', { name: /bagikan/i }),
    ).not.toBeInTheDocument();
  });

  /**
   * Ketiga status dalam SATU tabel. Uji per-baris di atas masing-masing hanya
   * melihat satu status, sehingga pemagaran yang keliru memakai status baris
   * pertama untuk seluruh tabel akan lolos ketiganya.
   */
  it('memagari per baris, bukan per tabel', () => {
    render1([
      survei(1, 'Survei Aktif', 'AKTIF'),
      survei(2, 'Survei Draf', 'DRAF'),
      survei(3, 'Survei Ditutup', 'DITUTUP'),
    ]);

    expect(screen.getAllByRole('button', { name: /bagikan/i })).toHaveLength(1);
    expect(within(baris('Survei Aktif')).getByRole('button', { name: /bagikan/i })).toBeInTheDocument();
  });

  /**
   * KONTROL. Tanpa ini, menghapus tombolnya sama sekali dari tabel akan
   * membuat setiap uji "menyembunyikan" di atas hijau selamanya.
   */
  it('KONTROL: aksi Detail tetap ada pada ketiga status', () => {
    render1([
      survei(1, 'Survei Aktif', 'AKTIF'),
      survei(2, 'Survei Draf', 'DRAF'),
      survei(3, 'Survei Ditutup', 'DITUTUP'),
    ]);

    expect(screen.getAllByRole('link', { name: /detail/i })).toHaveLength(3);
  });
});
