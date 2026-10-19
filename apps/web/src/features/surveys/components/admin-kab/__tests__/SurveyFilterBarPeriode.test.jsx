import React from 'react';
import { render, screen } from '@testing-library/react';
import SurveyFilterBar from '../SurveyFilterBar';

/**
 * PENYARING PERIODE DIPISAH DI KETIGA TEMPATNYA (6 Oktober 2026, permintaan
 * pengguna: "ubah dropdown periode menjadi pisah antara triwulan dan tahun
 * berbeda dropdown. lihat disemua halaman").
 *
 * Tiga tempat memakai dropdown gabungan: navbar Admin Kabupaten, navbar Admin
 * OPD, dan penyaring daftar survei ini. Diuji di sini karena inilah satu-satunya
 * dari ketiganya yang dapat dirender tanpa seluruh kerangka layout -- kedua
 * navbar menuntut penyedia konteks layout. Komponen bersamanya sendiri
 * (`PenyaringPeriode`) punya ujinya sendiri.
 */
const SURVEI = [
  { id: '1', title: 'Survei A', period: '2026-Q1', status: 'AKTIF', opdId: 1 },
  { id: '2', title: 'Survei B', period: '2025-Q3', status: 'AKTIF', opdId: 2 },
];

const sajikan = (props = {}) =>
  render(
    <SurveyFilterBar
      filters={props.filters ?? { search: '', opd: '', status: '', periode: '2026-Q1' }}
      onFilterChange={props.onFilterChange ?? jest.fn()}
      onReset={jest.fn()}
      opdOptions={[{ value: '', label: 'Semua OPD' }]}
      statusOptions={[{ value: '', label: 'Semua Status' }]}
      tahunOptions={props.tahunOptions ?? [{ value: '2026', label: '2026' }, { value: '2025', label: '2025' }]}
      surveys={SURVEI}
    />,
  );

describe('SurveyFilterBar — periode dipisah dua dropdown', () => {
  it('menyediakan dropdown Tahun dan Triwulan, bukan satu gabungan', () => {
    sajikan();

    expect(screen.getByLabelText('Tahun')).toBeInTheDocument();
    expect(screen.getByLabelText('Triwulan')).toBeInTheDocument();
  });

  it('tak ada lagi pilihan gabungan "Triwulan I - 2026"', () => {
    sajikan();

    expect(screen.queryByText('Triwulan I - 2026')).not.toBeInTheDocument();
  });
});
