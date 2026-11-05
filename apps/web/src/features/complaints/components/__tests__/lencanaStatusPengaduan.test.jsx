import React from 'react';
import { render, screen } from '@testing-library/react';
import AdminComplaintTable from '../AdminComplaintTable';
import ComplaintInfoCard from '../ComplaintInfoCard';
import ComplaintRow from '../ComplaintRow';
import ComplaintTable from '../admin-kab/ComplaintTable';
import RecentComplaintWidget from '../RecentComplaintWidget';
import ActivityHistoryTable from '@/features/dashboards/components/ActivityHistoryTable';
import { getComplaints } from '@/features/complaints/services/complaints.api';
import { getMySurveyResponses } from '@/features/surveys/services/surveys.api';

jest.mock('@/features/complaints/services/complaints.api', () => ({
  getComplaints: jest.fn(),
}));

jest.mock('@/features/surveys/services/surveys.api', () => ({
  getMySurveyResponses: jest.fn(),
}));

/**
 * Warna lencana status di keenam tampilan pengaduan (BUG-081, 5 November 2026).
 *
 * Keenamnya dulu punya pemetaan sendiri yang masih mengenal `Diterima` dan
 * `Diproses`, sehingga seluruh status baru alur lima tahap jatuh ke warna
 * cadangan tanpa ada yang memerah. Harapan di bawah ditulis tangan, bukan
 * dibaca dari `COMPLAINT_STATUS_BADGE_VARIANT`: uji yang membaca tabel yang
 * sama dengan kodenya tak akan memerah bila tabel itu salah.
 */
const KELAS_MENURUT_STATUS = [
  ['Menunggu Verifikasi', 'bg-yellow-100'],
  ['Diverifikasi', 'bg-blue-100'],
  ['Sedang Ditindaklanjuti', 'bg-yellow-100'],
  ['Selesai', 'bg-green-100'],
  ['Ditolak', 'bg-error-container'],
  ['Perlu Perbaikan', 'bg-secondary-container'],
  ['Dialihkan', 'bg-blue-100'],
];

const baris = (status) => ({
  id: 'PGD1',
  status,
  title: 'Judul',
  dateStr: '1 Nov 2026',
  ageDays: 1,
  opdId: 1,
  target: 'Dinas',
  kategori: 'kab_lainnya',
  department: 'Dinas',
  reporter: { name: 'Warga', initials: 'WG' },
});

describe.each(KELAS_MENURUT_STATUS)('lencana status %s', (status, kelas) => {
  it('tabel Admin OPD', () => {
    render(<AdminComplaintTable complaints={[baris(status)]} />);
    expect(screen.getByText(status)).toHaveClass(kelas);
  });

  it('tabel Admin Kabupaten', () => {
    render(<ComplaintTable complaints={[baris(status)]} categoryMap={{}} onForward={jest.fn()} />);
    expect(screen.getByText(status)).toHaveClass(kelas);
  });

  it('kartu info pelapor', () => {
    render(<ComplaintInfoCard ticketId="PGD1" date="1 Nov 2026" target="Dinas" status={status} />);
    // Kartu ini mencetak statusnya dalam huruf besar.
    expect(screen.getByText(status.toUpperCase())).toHaveClass(kelas);
  });

  it('baris daftar pelapor', () => {
    render(
      <table>
        <tbody>
          <ComplaintRow id="PGD1" date="1 Nov 2026" department="Dinas" title="Judul" status={status} />
        </tbody>
      </table>,
    );
    expect(screen.getByText(status)).toHaveClass(kelas);
  });

  it('widget pengaduan terakhir di dashboard warga', async () => {
    getComplaints.mockResolvedValue({ data: [baris(status)] });
    render(<RecentComplaintWidget />);
    expect(await screen.findByText(status)).toHaveClass(kelas);
  });

  it('riwayat aktivitas di dashboard warga', async () => {
    getComplaints.mockResolvedValue({
      data: [{ ...baris(status), createdAt: '2026-11-01T00:00:00Z' }],
      meta: { pagination: { total: 1 } },
    });
    getMySurveyResponses.mockResolvedValue({ data: [], meta: { pagination: { total: 0 } } });
    render(<ActivityHistoryTable />);
    expect(await screen.findByText(status)).toHaveClass(kelas);
  });
});

it('baris survei di riwayat aktivitas tetap hijau, walau "Terkirim" abu-abu bagi pengaduan', async () => {
  getComplaints.mockResolvedValue({ data: [], meta: { pagination: { total: 0 } } });
  getMySurveyResponses.mockResolvedValue({
    data: [{ id: 1, title: 'Survei', submittedAt: '2026-11-01T00:00:00Z' }],
    meta: { pagination: { total: 1 } },
  });
  render(<ActivityHistoryTable />);
  expect(await screen.findByText('Terkirim')).toHaveClass('bg-green-100');
});
