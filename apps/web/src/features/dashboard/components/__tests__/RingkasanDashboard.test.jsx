import React from 'react';
import { render, screen } from '@testing-library/react';
import KabSummaryMetrics from '../kabupaten/KabSummaryMetrics';
import RecentActivities from '../kabupaten/RecentActivities';
import { adaptRecentActivity, adaptRecentActivityList } from '../../adapters/recentActivities.adapter';

/**
 * TC-FE-045 — Kartu ringkasan & tabel aktivitas dasbor Kabupaten.
 *
 * Melengkapi TC-FE-012 yang sudah menjaga kedua grafiknya. Yang dijaga di sini
 * adalah angka-angka besar di atas layar — bagian yang paling sering dilihat
 * pimpinan dan paling jarang diperiksa ulang.
 *
 * Kerusakan yang ditangkap:
 *  - nilai yang belum tersedia digambar sebagai **0** alih-alih '-'. Pada skala
 *    IKM 1-4 (atau 0-100), angka 0 berarti pelayanan terburuk — kebalikan dari
 *    "belum ada data", dan pada dasbor pimpinan itu salah baca yang mahal;
 *  - huruf mutu agregat DIDERIVASI sendiri di frontend. Backend sengaja tak
 *    menghitungnya untuk rata-rata lintas-OPD (`IkmService.mutuFromNilai` hanya
 *    untuk nilai per-survei), jadi menampilkannya berarti mengarang penilaian
 *    resmi yang tak pernah ada;
 *  - aktivitas terbaru memakai nama OPD & ikon per-domain karangan, bukan jenis
 *    entitas audit yang sungguhan (cacat lama INT-24);
 *  - daftar aktivitas kosong tampil sebagai kotak kosong tanpa keterangan.
 */

const RINGKASAN = {
  ikmScore: 82.47,
  ikmGrade: null,
  ikmLabel: null,
  totalRespondents: 12345,
  openComplaints: 8,
  newComplaints: 3,
  systemActivityPercent: 64,
};

describe('KabSummaryMetrics (TC-FE-045)', () => {
  it('menampilkan rata-rata IKM dua desimal dan jumlah responden berpemisah ribuan', () => {
    render(<KabSummaryMetrics data={RINGKASAN} />);

    expect(screen.getByText('82.47')).toBeInTheDocument();
    // 12345 mentah sulit dibaca sekilas; format Indonesia memakai titik.
    expect(screen.getByText('12.345')).toBeInTheDocument();
  });

  it('menuliskan "Mutu: -" alih-alih mengarang huruf mutu agregat', () => {
    render(<KabSummaryMetrics data={RINGKASAN} />);

    // Backend TIDAK menghitung mutu untuk rata-rata lintas-OPD. Menderivasinya
    // sendiri di sini berarti menerbitkan penilaian resmi yang tak berdasar.
    expect(screen.getByText('Mutu: -')).toBeInTheDocument();
  });

  it('menampilkan huruf mutu apa adanya ketika backend memang mengirimnya', () => {
    render(<KabSummaryMetrics data={{ ...RINGKASAN, ikmGrade: 'B', ikmLabel: 'Baik' }} />);

    expect(screen.getByText('Mutu: B (Baik)')).toBeInTheDocument();
  });

  it('membedakan IKM yang belum ada dari IKM bernilai nol', () => {
    render(<KabSummaryMetrics data={{ ...RINGKASAN, ikmScore: null }} />);

    expect(screen.getByText('-')).toBeInTheDocument();
    expect(screen.queryByText('0.00')).not.toBeInTheDocument();
  });

  it('tidak merender apa pun sebelum datanya tiba', () => {
    // Kartu berisi nol sekejap lalu berubah membuat pimpinan sempat membaca
    // angka yang salah.
    const { container } = render(<KabSummaryMetrics data={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('adaptRecentActivity (TC-FE-045)', () => {
  const log = (over = {}) => ({
    id: 1849,
    entitas: 'survey',
    summary: 'UPDATE STATUS Survei',
    user: 'Siti Aminah',
    createdAt: new Date(Date.now() - 3600 * 1000).toISOString(),
    ...over,
  });

  it('memilih ikon menurut jenis entitas audit, bukan menurut nama OPD', () => {
    // Cacat lama INT-24: ikon per-domain karangan (RSUD, DLH) yang dipasangkan
    // dengan nama OPD yang tak pernah dikirim backend.
    expect(adaptRecentActivity(log({ entitas: 'survey' })).icon).toBe('school');
    expect(adaptRecentActivity(log({ entitas: 'complaint' })).icon).toBe('report');
    expect(adaptRecentActivity(log({ entitas: 'opd' })).icon).toBe('foundation');
    expect(adaptRecentActivity(log({ entitas: 'user' })).icon).toBe('badge');
  });

  it('jatuh ke ikon umum untuk entitas yang belum dikenal', () => {
    expect(adaptRecentActivity(log({ entitas: 'entitas_baru' })).icon).toBe('report');
  });

  it('menyebut "Sistem" ketika aksinya tak berpelaku', () => {
    // Sebagian entri audit lahir dari proses terjadwal, bukan dari orang.
    expect(adaptRecentActivity(log({ user: null })).publisher).toBe('Sistem');
  });

  it('menautkan tiap entri ke arsip audit miliknya sendiri', () => {
    expect(adaptRecentActivity(log({ id: 77 })).link).toBe('/admin-kab/audit-logs/77');
  });

  it('menerjemahkan seluruh daftar sekaligus', () => {
    const hasil = adaptRecentActivityList([log({ id: 1 }), log({ id: 2, entitas: 'opd' })]);
    expect(hasil.map((h) => h.id)).toEqual([1, 2]);
    expect(hasil[1].icon).toBe('foundation');
  });
});

describe('RecentActivities (TC-FE-045)', () => {
  const AKTIVITAS = [
    {
      id: 1,
      icon: 'school',
      title: 'UPDATE STATUS Survei',
      publisher: 'Siti Aminah',
      timeLabel: '1 jam lalu',
      link: '/admin-kab/audit-logs/1',
    },
    {
      id: 2,
      icon: 'report',
      title: 'CREATE Pengaduan',
      publisher: 'Sistem',
      timeLabel: '2 jam lalu',
      link: '/admin-kab/audit-logs/2',
    },
  ];

  it('menampilkan judul, pelaku, waktu, dan tautan detail tiap aktivitas', () => {
    render(<RecentActivities data={AKTIVITAS} />);

    expect(screen.getByText('UPDATE STATUS Survei')).toBeInTheDocument();
    expect(screen.getByText('Siti Aminah')).toBeInTheDocument();
    expect(screen.getByText('1 jam lalu')).toBeInTheDocument();

    const tautanDetail = screen.getAllByRole('link', { name: /Buka Detail/ });
    expect(tautanDetail[0]).toHaveAttribute('href', '/admin-kab/audit-logs/1');
  });

  it('menyimpan judul panjang di `title` sehingga tetap terbaca saat terpotong', () => {
    render(<RecentActivities data={AKTIVITAS} />);
    expect(screen.getByText('UPDATE STATUS Survei')).toHaveAttribute(
      'title',
      'UPDATE STATUS Survei',
    );
  });

  it('menerangkan daftar kosong alih-alih menampilkan kotak kosong', () => {
    render(<RecentActivities data={[]} />);
    expect(screen.getByText('Tidak ada aktivitas terbaru.')).toBeInTheDocument();
  });

  it('menawarkan jalan ke arsip audit lengkap', () => {
    render(<RecentActivities data={AKTIVITAS} />);
    expect(screen.getByRole('link', { name: 'Arsip Lengkap' })).toHaveAttribute(
      'href',
      '/admin-kab/audit-logs',
    );
  });
});
