import React from 'react';
import { render, screen } from '@testing-library/react';
import ActivityHistoryTable from '../ActivityHistoryTable';
import { getComplaints } from '@/features/complaints/services/complaints.api';
import { getMySurveyResponses } from '@/features/surveys/services/surveys.api';

jest.mock('@/features/complaints/services/complaints.api', () => ({
  getComplaints: jest.fn(),
}));

jest.mock('@/features/surveys/services/surveys.api', () => ({
  getMySurveyResponses: jest.fn(),
}));

/**
 * RIWAYAT AKTIVITAS WARGA MEMOTONG DIAM-DIAM (15 Oktober 2026).
 *
 * `MAX_ROWS = 10` dan tak ada apa pun yang mengatakannya: tak ada catatan, tak
 * ada tautan "lihat semua". Warga dengan dua puluh pengaduan melihat sepuluh
 * dan tak punya alasan menyangka ada sisanya.
 *
 * Totalnya dihitung dari `meta.pagination.total` KEDUA sumber, bukan dari
 * panjang array -- array-nya memang sudah dibatasi sepuluh di permintaannya,
 * jadi memakainya akan selalu berbunyi "sepuluh dari sepuluh".
 */
const pengaduan = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    target: 'Dinas Kesehatan',
    status: 'Diterima',
    createdAt: `2026-10-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
  }));

const respons = (n) =>
  Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    title: `Survei ${i + 1}`,
    opd: 'Dinas Kesehatan',
    period: '2026-Q4',
    submittedAt: `2026-09-${String(i + 1).padStart(2, '0')}T00:00:00Z`,
  }));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('ActivityHistoryTable — catatan pemotongan', () => {
  it('mengatakan jumlah yang ditampilkan dan total kedua sumbernya', async () => {
    getComplaints.mockResolvedValue({
      data: pengaduan(10),
      meta: { pagination: { total: 40 } },
    });
    getMySurveyResponses.mockResolvedValue({
      data: respons(10),
      meta: { pagination: { total: 15 } },
    });

    render(<ActivityHistoryTable />);
    await screen.findAllByText(/Mengajukan Pengaduan/);

    const catatan = await screen.findByRole('status');
    // Sepuluh baris ditampilkan, 40 + 15 = 55 aktivitas seluruhnya.
    expect(catatan).toHaveTextContent('10');
    expect(catatan).toHaveTextContent('55');
  });

  it('TIDAK memasang catatan ketika seluruh aktivitas memang tertampil (kendali)', async () => {
    getComplaints.mockResolvedValue({
      data: pengaduan(2),
      meta: { pagination: { total: 2 } },
    });
    getMySurveyResponses.mockResolvedValue({
      data: respons(1),
      meta: { pagination: { total: 1 } },
    });

    render(<ActivityHistoryTable />);
    await screen.findAllByText(/Mengajukan Pengaduan/);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('TIDAK memasang catatan ketika meta tak dikirim sama sekali', async () => {
    // Ketiadaan data bukan bukti pemotongan; peringatan palsu lebih buruk
    // daripada tak ada peringatan.
    getComplaints.mockResolvedValue({ data: pengaduan(3) });
    getMySurveyResponses.mockResolvedValue({ data: respons(1) });

    render(<ActivityHistoryTable />);
    await screen.findAllByText(/Mengajukan Pengaduan/);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
