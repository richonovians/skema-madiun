import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardSummary from '../DashboardSummary';

/**
 * KARTU AKUN AKTIF, ADMIN OPD (15 September 2026, permintaan pengguna).
 *
 * Sebelumnya angka ini berupa strip terpisah di atas grid ringkasan. Pengguna
 * memintanya berdiri sebagai kartu, sejajar di kanan "Rata-rata Respon".
 *
 * Lingkupnya WAJIB ikut tertulis di kartunya. Yang dihitung adalah AKUN admin
 * yang tertaut OPD ini -- biasanya satu atau dua orang -- sedangkan tetangganya
 * di baris yang sama menghitung warga dan tiket. Tanpa keterangan itu, angka 1
 * di samping "Total Responden 1" terbaca sebagai "cuma satu warga yang dilayani".
 */
const ringkasan = (over = {}) => ({
  ikmScore: '75.00',
  ikmGrade: 'C (Kurang Baik)',
  totalRespondents: 1,
  respondentTrend: 'Belum ada data pembanding',
  respondentTrendPercent: null,
  activeTickets: 0,
  avgResponseTime: '153 Jam',
  avgResponseHours: 153,
  slaTargetHours: 24,
  slaTarget: '24 Jam',
  activeOpdUsers: 3,
  ...over,
});

const JUDUL_KARTU = /^(Skor IKM|Total Responden|Tiket Aktif|Rata-rata Respon|Akun Aktif)$/;

describe('DashboardSummary — kartu akun aktif', () => {
  it('berdiri sebagai kartu kelima, sesudah "Rata-rata Respon"', () => {
    render(<DashboardSummary summaryData={ringkasan()} />);

    const judul = screen.getAllByText(JUDUL_KARTU).map((el) => el.textContent);

    expect(judul).toEqual([
      'Skor IKM',
      'Total Responden',
      'Tiket Aktif',
      'Rata-rata Respon',
      'Akun Aktif',
    ]);
  });

  it('menyebut lingkupnya: akun yang tertaut OPD ini', () => {
    render(<DashboardSummary summaryData={ringkasan()} />);

    expect(screen.getByText(/tertaut OPD ini/i)).toBeInTheDocument();
  });

  /**
   * PASANGAN kontrol. Angka yang dipatok di markup juga lolos uji "ada kartunya"
   * -- dan justru itu bentuk kegagalan yang paling sulit terlihat, karena
   * layarnya tetap menampilkan angka yang masuk akal.
   */
  it('angkanya datang dari data, bukan dipatok', () => {
    const { rerender } = render(<DashboardSummary summaryData={ringkasan({ activeOpdUsers: 3 })} />);
    expect(screen.getByText('3')).toBeInTheDocument();

    rerender(<DashboardSummary summaryData={ringkasan({ activeOpdUsers: 12 })} />);
    expect(screen.getByText('12')).toBeInTheDocument();
  });

  /**
   * `GET /dashboard/opd` dapat menjawab tanpa medan ini (backend lama, atau
   * tanggapan yang tersimpan sebelum medannya ada). Nol adalah PERNYATAAN --
   * "tak ada akun aktif di OPD ini" -- dan menuliskannya saat kita sebenarnya
   * belum tahu adalah mengarang kabar buruk.
   */
  it('tanpa angkanya, kartunya menulis "-" bukan 0', () => {
    render(<DashboardSummary summaryData={ringkasan({ activeOpdUsers: undefined })} />);

    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
