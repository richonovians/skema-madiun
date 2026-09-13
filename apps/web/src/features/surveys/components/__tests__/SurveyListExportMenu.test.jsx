import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { downloadTablePdf } from '@/utils/pdf';
import { unduhCsv } from '@/utils/unduh';
import { KOLOM_SURVEI_OPD } from '@/utils/pdfKolom';
import SurveyListExportMenu from '../SurveyListExportMenu';

jest.mock('@/utils/pdf', () => ({ downloadTablePdf: jest.fn() }));
jest.mock('@/utils/unduh', () => ({ unduhCsv: jest.fn() }));

const surveys = [
  { id: 1, title: 'Survei Loket Pelayanan', period: '2026-Q3', status: 'AKTIF', respondentsCount: 128, ikmScore: 82.44 },
  { id: 2, title: 'Survei Poli Umum', period: '2026-Q2', status: 'DRAF', respondentsCount: 0, ikmScore: null },
];

const bukaMenu = () => fireEvent.click(screen.getByRole('button', { name: /ekspor/i }));

beforeEach(() => jest.clearAllMocks());

describe('SurveyListExportMenu', () => {
  it('Ekspor PDF memakai susunan kolom survei OPD', async () => {
    render(<SurveyListExportMenu surveys={surveys} />);
    bukaMenu();

    fireEvent.click(screen.getByText(/ekspor pdf/i));

    await waitFor(() => expect(downloadTablePdf).toHaveBeenCalledTimes(1));
    expect(downloadTablePdf.mock.calls[0][0].columns).toBe(KOLOM_SURVEI_OPD);
  });

  it('status dicetak sebagai label, bukan kode mentah basis data', async () => {
    render(<SurveyListExportMenu surveys={surveys} />);
    bukaMenu();

    fireEvent.click(screen.getByText(/ekspor pdf/i));

    await waitFor(() => expect(downloadTablePdf).toHaveBeenCalled());
    const baris = downloadTablePdf.mock.calls[0][0].rows;
    expect(baris[0]).toContain('Aktif');
    expect(baris[0]).not.toContain('AKTIF');
  });

  it('survei berstatus draf tidak menampilkan angka responden yang menyesatkan', async () => {
    render(<SurveyListExportMenu surveys={surveys} />);
    bukaMenu();

    fireEvent.click(screen.getByText(/ekspor pdf/i));

    await waitFor(() => expect(downloadTablePdf).toHaveBeenCalled());
    // Draf belum pernah dibagikan, jadi "0 responden" membaca seolah gagal
    // menarik peserta, bukan belum terbit.
    expect(downloadTablePdf.mock.calls[0][0].rows[1]).toContain('-');
  });

  it('Ekspor Excel menurunkan CSV berisi judul surveinya', async () => {
    render(<SurveyListExportMenu surveys={surveys} />);
    bukaMenu();

    fireEvent.click(screen.getByText(/ekspor excel/i));

    await waitFor(() => expect(unduhCsv).toHaveBeenCalledTimes(1));
    expect(JSON.stringify(unduhCsv.mock.calls[0][0].rows)).toContain('Survei Loket Pelayanan');
  });
});
