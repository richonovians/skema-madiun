import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SurveysPage from '../page';
import { getActiveSurveys } from '@/features/surveys/services/surveys.api';

const push = jest.fn();
let query = '';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(query),
}));

jest.mock('@/features/surveys/services/surveys.api', () => ({
  getActiveSurveys: jest.fn(),
}));

jest.mock('@/features/opd/services/opd.api', () => ({
  getOpdList: jest.fn().mockResolvedValue({ data: [] }),
}));

/**
 * TOMBOL "SEMUA SURVEI" MENGOSONGKAN PENCARIAN (30 Oktober 2026, permintaan
 * pengguna). Sebelumnya tombol itu hanya melepas penyaring instansi lewat
 * `router.push('/surveys')`; kata kunci yang sudah diketik tetap tinggal, jadi
 * daftarnya tetap tersaring padahal tombolnya berbunyi "Semua".
 */
const SURVEI = [
  { id: '1', title: 'Survei Layanan Puskesmas', opd: 'Dinas Kesehatan', questionsCount: 9 },
  { id: '2', title: 'Survei Layanan Perizinan', opd: 'Dinas Komunikasi dan Informatika', questionsCount: 9 },
];

beforeEach(() => {
  query = '';
  push.mockClear();
  getActiveSurveys.mockResolvedValue({ data: SURVEI });
});

async function cari(kata) {
  render(<SurveysPage />);
  await screen.findByText('Survei Layanan Puskesmas');
  fireEvent.change(screen.getByPlaceholderText('Cari Instansi/OPD...'), {
    target: { value: kata },
  });
}

describe('Daftar survei warga — tombol Semua Survei', () => {
  it('mengosongkan kolom pencarian dan menampilkan seluruh survei', async () => {
    await cari('komunikasi');
    expect(screen.queryByText('Survei Layanan Puskesmas')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Semua Survei' }));

    expect(screen.getByPlaceholderText('Cari Instansi/OPD...')).toHaveValue('');
    expect(screen.getByText('Survei Layanan Puskesmas')).toBeInTheDocument();
    expect(screen.getByText('Survei Layanan Perizinan')).toBeInTheDocument();
  });

  it('tampil tidak aktif selama ada kata kunci pencarian', async () => {
    await cari('komunikasi');

    expect(screen.getByRole('button', { name: 'Semua Survei' }).className).toMatch(/bg-surface\b/);
  });

  it('KONTROL: tanpa pencarian dan tanpa instansi, tombolnya tampil aktif', async () => {
    render(<SurveysPage />);
    await screen.findByText('Survei Layanan Puskesmas');

    expect(screen.getByRole('button', { name: 'Semua Survei' }).className).not.toMatch(
      /bg-surface\b/,
    );
  });

  it('KONTROL: penyaring instansi tetap dilepas lewat /surveys', async () => {
    query = 'opdId=7';
    render(<SurveysPage />);
    await screen.findByText('Survei Layanan Puskesmas');

    fireEvent.click(screen.getByRole('button', { name: 'Semua Survei' }));

    expect(push).toHaveBeenCalledWith('/surveys');
  });
});
