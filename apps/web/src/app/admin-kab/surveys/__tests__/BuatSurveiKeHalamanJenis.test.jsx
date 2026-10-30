import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import AdminKabSurveysPage from '../page';
import { createSurvey, getSurveys } from '@/features/surveys/services/surveys.api';
import { getOpdList } from '@/features/opd/services/opd.api';

const push = jest.fn();
jest.mock('next/navigation', () => ({ useRouter: () => ({ push }) }));

jest.mock('@/features/surveys/services/surveys.api', () => ({
  getSurveys: jest.fn(),
  createSurvey: jest.fn(),
  updateSurvey: jest.fn(),
  updateSurveyStatus: jest.fn(),
  deleteSurvey: jest.fn(),
  duplicateSurvey: jest.fn(),
}));

jest.mock('@/features/opd/services/opd.api', () => ({
  getOpdList: jest.fn(),
}));

/**
 * "PILIH JENIS SURVEI" MEMBAWA ISIAN MODAL KE HALAMAN JENIS (30 Oktober 2026,
 * permintaan pengguna). Modal Buat Paket Survei tak lagi membuat survei: ia
 * mengantar ke `/admin-kab/surveys/builder/new` dengan isiannya di URL, dan
 * survei baru dibuat di sana sesudah jenisnya dikonfirmasi. Isian di URL, bukan
 * di memori, supaya memuat ulang halaman jenis tidak menghapusnya.
 */
beforeEach(() => {
  jest.clearAllMocks();
  getSurveys.mockResolvedValue({ data: [], meta: { total: 0 } });
  getOpdList.mockResolvedValue({
    data: [{ id: 7, name: 'Dinas Kesehatan', status: 'ACTIVE' }],
    meta: { total: 1 },
  });
});

async function isiModal() {
  render(<AdminKabSurveysPage />);
  fireEvent.click(await screen.findByRole('button', { name: 'Buat Survei' }));
  fireEvent.change(screen.getByLabelText(/judul survei/i), {
    target: { value: 'Survei Layanan & Puskesmas' },
  });
  fireEvent.click(screen.getByLabelText(/opd penyelenggara/i));
  fireEvent.click(screen.getByRole('button', { name: 'Dinas Kesehatan' }));
  fireEvent.click(screen.getByLabelText(/izinkan pengisian/i));
}

describe('Admin Kabupaten — Buat Paket Survei', () => {
  it('"Pilih Jenis Survei" membuka halaman jenis dengan isian modal di URL', async () => {
    await isiModal();

    fireEvent.click(screen.getByRole('button', { name: 'Pilih Jenis Survei' }));

    expect(push).toHaveBeenCalledTimes(1);
    const url = new URL(push.mock.calls[0][0], 'http://skema.local');
    expect(url.pathname).toBe('/admin-kab/surveys/builder/new');
    expect(url.searchParams.get('opd')).toBe('7');
    expect(url.searchParams.get('judul')).toBe('Survei Layanan & Puskesmas');
    expect(url.searchParams.get('periode')).toMatch(/^\d{4}-Q[1-4]$/);
    expect(url.searchParams.get('anonim')).toBe('1');
  });

  it('belum ada survei yang dibuat sebelum jenisnya dipilih', async () => {
    await isiModal();

    fireEvent.click(screen.getByRole('button', { name: 'Pilih Jenis Survei' }));

    expect(createSurvey).not.toHaveBeenCalled();
  });
});
