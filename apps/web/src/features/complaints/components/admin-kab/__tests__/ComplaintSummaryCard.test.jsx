import React from 'react';
import { render, screen } from '@testing-library/react';
import ComplaintSummaryCard from '../ComplaintSummaryCard';

/**
 * Kartu ini dipakai KETIGA halaman detail (warga, Admin OPD, Admin Kabupaten),
 * jadi yang diuji di sini berlaku bagi ketiganya sekaligus.
 */
const complaint = (over = {}) => ({
  categoryLabel: 'Kesehatan',
  target: 'Dinas Kesehatan',
  createdAt: '2026-11-04T02:00:00.000Z',
  tingkat: 'kabupaten',
  incidentDate: '2026-11-01T00:00:00.000Z',
  incidentDateStr: '1 November 2026',
  incidentLocation: 'Balai Desa Bangunsari',
  reporter: { name: 'Siti Aminah' },
  ...over,
});

describe('ComplaintSummaryCard — tingkat & kejadian (4 November 2026)', () => {
  it('menampilkan tingkat dalam bahasa manusia, bukan kode enumnya', () => {
    render(<ComplaintSummaryCard complaint={complaint()} />);

    expect(screen.getByText('Tingkat')).toBeInTheDocument();
    expect(screen.getByText('Kabupaten')).toBeInTheDocument();
    // Kode mentah tak boleh bocor ke layar petugas.
    expect(screen.queryByText('kabupaten')).not.toBeInTheDocument();
  });

  it('menampilkan tingkat kecamatan', () => {
    render(<ComplaintSummaryCard complaint={complaint({ tingkat: 'kecamatan' })} />);

    expect(screen.getByText('Kecamatan')).toBeInTheDocument();
  });

  it('menampilkan tanggal & lokasi kejadian', () => {
    render(<ComplaintSummaryCard complaint={complaint()} />);

    expect(screen.getByText('Tanggal Kejadian')).toBeInTheDocument();
    expect(screen.getByText('1 November 2026')).toBeInTheDocument();
    expect(screen.getByText('Lokasi Kejadian')).toBeInTheDocument();
    expect(screen.getByText('Balai Desa Bangunsari')).toBeInTheDocument();
  });

  it('tanggal kejadian digambar TANPA jam, berbeda dari Tanggal Dibuat', () => {
    // Kolomnya DATE: tak ada jam yang pernah dikumpulkan. "Tanggal Dibuat" di
    // sebelahnya memang membawa jam & "WIB", dan dua baris bersebelahan yang
    // terlihat sama bentuk akan membuat petugas mengira jam kejadiannya pukul
    // 00.00.
    render(<ComplaintSummaryCard complaint={complaint()} />);

    expect(screen.getByText('1 November 2026')).toBeInTheDocument();
    expect(screen.queryByText(/1 November 2026.*WIB/)).not.toBeInTheDocument();
    // KONTROL: Tanggal Dibuat tetap membawa jam.
    expect(screen.getByText(/WIB$/)).toBeInTheDocument();
  });

  /**
   * 19 pengaduan dibuat SEBELUM kedua medan ini ada, dan backend
   * mengirimkannya `null`. Barisnya disembunyikan, bukan diisi tanda hubung:
   * tanda hubung di sebelah "Lokasi Kejadian" terbaca seperti data yang hilang,
   * dan petugas akan mencarinya.
   */
  it('pengaduan lama: kedua baris kejadian DISEMBUNYIKAN, bukan bertanda hubung', () => {
    render(
      <ComplaintSummaryCard
        complaint={complaint({
          incidentDate: null,
          incidentDateStr: null,
          incidentLocation: null,
        })}
      />,
    );

    expect(screen.queryByText('Tanggal Kejadian')).not.toBeInTheDocument();
    expect(screen.queryByText('Lokasi Kejadian')).not.toBeInTheDocument();
    // KONTROL: sisa kartunya tetap tergambar, bukan ikut hilang.
    expect(screen.getByText('Kategori')).toBeInTheDocument();
    expect(screen.getByText('Dinas Kesehatan')).toBeInTheDocument();
  });

  it('tingkat yang tak dikenal tetap terbaca apa adanya, bukan menjadi tanda hubung', () => {
    // Kode tingkat yang kelak ditambahkan tanpa label di kartu ini masih harus
    // memberi tahu petugas apa isinya.
    render(<ComplaintSummaryCard complaint={complaint({ tingkat: 'provinsi' })} />);

    expect(screen.getByText('provinsi')).toBeInTheDocument();
  });

  it('tanpa tingkat sama sekali: tanda hubung', () => {
    render(<ComplaintSummaryCard complaint={complaint({ tingkat: null })} />);

    const nilaiTingkat = screen.getByText('Tingkat').parentElement;
    expect(nilaiTingkat).toHaveTextContent('-');
  });
});
