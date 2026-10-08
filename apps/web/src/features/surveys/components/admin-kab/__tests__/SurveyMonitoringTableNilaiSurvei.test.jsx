import React from 'react';
import { render, screen, within } from '@testing-library/react';
import SurveyMonitoringTable from '../SurveyMonitoringTable';

/**
 * NILAI SURVEI di tabel pemantauan Admin Kabupaten (8 Oktober 2026). Baris
 * survei custom menampilkan "angka · kategori" dari backend pada kolom nilai
 * rata-rata; kolom IKM tetap "-" karena custom tak punya Nilai IKM.
 */
const survei = (id, title, extra = {}) => ({
  id: String(id),
  title,
  status: 'AKTIF',
  period: '2026-Q3',
  opdName: 'Dinas Contoh',
  respondentsCount: 5,
  ikmScore: null,
  averageScore: null,
  isUtama: false,
  ...extra,
});

const aksi = () => ({
  onEdit: jest.fn(),
  onPublish: jest.fn(),
  onClose: jest.fn(),
  onReopen: jest.fn(),
  onDelete: jest.fn(),
  onDuplicate: jest.fn(),
  onJadikanUtama: jest.fn(),
});

const baris = (judul) => screen.getByText(judul).closest('tr');

describe('SurveyMonitoringTable — Nilai Survei', () => {
  it('baris custom: angka dan kategori dari backend, judul angka sebagai title', () => {
    render(
      <SurveyMonitoringTable
        surveys={[
          survei(1, 'Survei Custom', {
            jenis: 'custom',
            averageScore: 3.4,
            nilaiSurvei: {
              judul: 'Indeks Penilaian',
              nilai: 85,
              tampilan: '85%',
              kategori: 'Sangat Baik',
            },
          }),
        ]}
        {...aksi()}
      />,
    );

    const sel = within(baris('Survei Custom')).getByText('85% · Sangat Baik');
    expect(sel).toHaveAttribute('title', 'Indeks Penilaian');
    // Bukan rata-rata polos "3.40" lagi.
    expect(within(baris('Survei Custom')).queryByText('3.40')).not.toBeInTheDocument();
  });

  it('baris custom tanpa nilai: "-", bukan 0', () => {
    render(
      <SurveyMonitoringTable
        surveys={[survei(2, 'Custom Kosong', { jenis: 'custom', nilaiSurvei: null })]}
        {...aksi()}
      />,
    );

    expect(within(baris('Custom Kosong')).queryByText('0.00')).not.toBeInTheDocument();
    expect(within(baris('Custom Kosong')).getAllByText('-').length).toBeGreaterThan(0);
  });

  it('baris SKM tak berubah: IKM dan rata-rata polos', () => {
    render(
      <SurveyMonitoringTable
        surveys={[
          survei(3, 'Survei SKM', {
            jenis: 'skm_permenpanrb',
            ikmScore: 81.25,
            averageScore: 3.25,
          }),
        ]}
        {...aksi()}
      />,
    );

    expect(within(baris('Survei SKM')).getByText('81.25')).toBeInTheDocument();
    expect(within(baris('Survei SKM')).getByText('3.25')).toBeInTheDocument();
  });
});
