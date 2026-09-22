import React from 'react';
import { render, screen } from '@testing-library/react';
import ComplaintContentCard from '../ComplaintContentCard';

/**
 * JUDUL DAN URAIAN DIPISAH (permintaan pengguna 22 September 2026).
 *
 * Mula-mula judulnya dibuat MENGGANTIKAN label "Deskripsi Laporan" -- satu
 * tajuk saja, dengan alasan labelnya hanya mengulang kepala kartunya. Pengguna
 * membatalkan itu: yang ia cari adalah dua hal yang dapat dibedakan sekilas,
 * bukan satu blok tulisan yang harus dibaca dulu untuk tahu mana judul dan mana
 * uraian.
 *
 * Kartu ini dipakai KETIGA halaman peran sekaligus -- warga, Admin OPD, dan
 * Admin Kabupaten -- jadi satu perubahan di sini berlaku di mana-mana, dan tak
 * ada halaman yang tertinggal tanpa ada yang menyadarinya.
 */
describe('ComplaintContentCard — judul dan uraian terpisah', () => {
  const pengaduan = (over = {}) => ({
    title: 'Jalan berlubang di depan kantor desa',
    description: 'Sudah tiga bulan tidak diperbaiki.',
    ...over,
  });

  it('menandai judul dengan label "Judul Pengaduan"', () => {
    render(<ComplaintContentCard complaint={pengaduan()} />);

    expect(screen.getByText('Judul Pengaduan')).toBeInTheDocument();
    expect(screen.getByText('Jalan berlubang di depan kantor desa')).toBeInTheDocument();
  });

  it('menandai uraian dengan label "Uraian Detail Kejadian"', () => {
    render(<ComplaintContentCard complaint={pengaduan()} />);

    expect(screen.getByText('Uraian Detail Kejadian')).toBeInTheDocument();
    expect(screen.getByText('Sudah tiga bulan tidak diperbaiki.')).toBeInTheDocument();
  });

  /**
   * INI YANG MEMBEDAKAN "dipisah" dari "dua tulisan berurutan". Label yang
   * dirender di luar bloknya masing-masing akan tetap membuat kedua uji di atas
   * hijau, sementara di layar keduanya tetap menyatu tak terbedakan.
   */
  it('tiap label berada di dalam blok isinya sendiri, bukan sekadar berurutan', () => {
    render(<ComplaintContentCard complaint={pengaduan()} />);

    const blokJudul = screen.getByText('Judul Pengaduan').closest('section');
    const blokUraian = screen.getByText('Uraian Detail Kejadian').closest('section');

    expect(blokJudul).not.toBe(blokUraian);
    expect(blokJudul).toHaveTextContent('Jalan berlubang di depan kantor desa');
    expect(blokJudul).not.toHaveTextContent('Sudah tiga bulan tidak diperbaiki.');
    expect(blokUraian).toHaveTextContent('Sudah tiga bulan tidak diperbaiki.');
  });

  /**
   * Pengaduan lama yang judulnya tak terbawa data tak boleh menyisakan label
   * menggantung tanpa isi. Uraiannya tetap yang utama dan tetap bertanda.
   */
  it('tanpa judul: blok judulnya tak dirender, blok uraian tetap ada', () => {
    render(<ComplaintContentCard complaint={pengaduan({ title: undefined })} />);

    expect(screen.queryByText('Judul Pengaduan')).not.toBeInTheDocument();
    expect(screen.getByText('Uraian Detail Kejadian')).toBeInTheDocument();
    expect(screen.getByText('Sudah tiga bulan tidak diperbaiki.')).toBeInTheDocument();
  });

  it('tanpa uraian: blok uraian menjelaskan kekosongannya, bukan dibiarkan hampa', () => {
    render(<ComplaintContentCard complaint={pengaduan({ description: '' })} />);

    expect(screen.getByText('Uraian Detail Kejadian')).toBeInTheDocument();
    expect(screen.getByText(/tidak ada deskripsi/i)).toBeInTheDocument();
  });

  /**
   * KONTROL: tanpa ini, kartu yang berhenti menampilkan isi apa pun dan hanya
   * mencetak dua label akan lolos seluruh uji di atas.
   */
  it('KONTROL: kepala kartu "Isi Pengaduan" tetap ada', () => {
    render(<ComplaintContentCard complaint={pengaduan()} />);

    expect(screen.getByRole('heading', { name: 'Isi Pengaduan' })).toBeInTheDocument();
  });
});
