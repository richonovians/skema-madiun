import React from 'react';
import { render, screen, within } from '@testing-library/react';
import SurveyMonitoringTable from '../SurveyMonitoringTable';

/**
 * KOLOM TABEL SURVEI ADMIN KABUPATEN (8 Oktober 2026, permintaan pengguna):
 * "ubah nama kolom nilai rata rata menjadi nilai survei, dan untuk survei skm
 * nilai survei berarti kosong, dan tambah kolom jenis survei".
 *
 * Urutan: JUDUL | OPD | JENIS SURVEI | PERIODE | RESPONDEN | NILAI IKM | NILAI
 * SURVEI | STATUS | AKSI. SKM punya kolom NILAI IKM sendiri, jadi kolom NILAI
 * SURVEI-nya "-"; rata-rata polos tak lagi tampil di tabel ini.
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
const sel = (judul, kolom) => {
  const tabel = screen.getByRole('table');
  const headers = within(tabel)
    .getAllByRole('columnheader')
    .map((h) => h.textContent.trim());
  return within(baris(judul)).getAllByRole('cell')[headers.indexOf(kolom)];
};

describe('SurveyMonitoringTable — kolom Jenis Survei dan Nilai Survei', () => {
  it('urutan kolom, tanpa "NILAI RATA-RATA"', () => {
    render(<SurveyMonitoringTable surveys={[survei(1, 'Survei A')]} {...aksi()} />);

    const headers = screen
      .getAllByRole('columnheader')
      .map((h) => h.textContent.trim());
    expect(headers).toEqual([
      'JUDUL SURVEI',
      'OPD PENYELENGGARA',
      'JENIS SURVEI',
      'PERIODE',
      'RESPONDEN',
      'NILAI IKM',
      'NILAI SURVEI',
      'STATUS',
      'AKSI',
    ]);
    expect(screen.queryByText('NILAI RATA-RATA')).not.toBeInTheDocument();
  });

  it('baris SKM: lencana "SKM", NILAI IKM terisi, NILAI SURVEI "-" walau rata-rata ada', () => {
    render(
      <SurveyMonitoringTable
        surveys={[
          survei(1, 'Survei SKM', {
            jenis: 'skm_permenpanrb',
            ikmScore: 81.25,
            averageScore: 3.25,
          }),
        ]}
        {...aksi()}
      />,
    );

    expect(sel('Survei SKM', 'JENIS SURVEI')).toHaveTextContent('SKM');
    expect(sel('Survei SKM', 'NILAI IKM')).toHaveTextContent('81.25');
    expect(sel('Survei SKM', 'NILAI SURVEI')).toHaveTextContent('-');
    expect(within(baris('Survei SKM')).queryByText('3.25')).not.toBeInTheDocument();
  });

  it('baris custom: lencana "Custom", NILAI IKM "-", NILAI SURVEI dari backend', () => {
    render(
      <SurveyMonitoringTable
        surveys={[
          survei(2, 'Survei Custom', {
            jenis: 'custom',
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

    expect(sel('Survei Custom', 'JENIS SURVEI')).toHaveTextContent('Custom');
    expect(sel('Survei Custom', 'NILAI IKM')).toHaveTextContent('-');
    expect(sel('Survei Custom', 'NILAI SURVEI')).toHaveTextContent('85% · Sangat Baik');
  });

  it('custom tanpa nilai: NILAI SURVEI "-", bukan nol', () => {
    render(
      <SurveyMonitoringTable
        surveys={[survei(3, 'Custom Kosong', { jenis: 'custom', nilaiSurvei: null })]}
        {...aksi()}
      />,
    );

    expect(sel('Custom Kosong', 'NILAI SURVEI')).toHaveTextContent(/^-$/);
  });

  it('jenis kosong atau tak dikenal (backend lama): "-" pada kolom jenis, tidak mengarang label', () => {
    render(
      <SurveyMonitoringTable
        surveys={[survei(4, 'Tanpa Jenis'), survei(5, 'Jenis Aneh', { jenis: 'umum' })]}
        {...aksi()}
      />,
    );

    expect(sel('Tanpa Jenis', 'JENIS SURVEI')).toHaveTextContent(/^-$/);
    expect(sel('Jenis Aneh', 'JENIS SURVEI')).toHaveTextContent(/^-$/);
  });

  it('daftar kosong: pesan kosong membentang seluruh sembilan kolom', () => {
    const { container } = render(<SurveyMonitoringTable surveys={[]} {...aksi()} />);

    const kosong = container.querySelector('tbody td[colspan]');
    expect(kosong).not.toBeNull();
    expect(kosong.getAttribute('colspan')).toBe('9');
  });
});
