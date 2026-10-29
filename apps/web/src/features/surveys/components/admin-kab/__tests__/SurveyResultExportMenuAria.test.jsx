import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SurveyResultExportMenu from '../SurveyResultExportMenu';
import KabDashboardHeader from '@/features/dashboard/components/kabupaten/KabDashboardHeader';

/**
 * Dua menu ekspor yang belum mengumumkan dirinya (27 Oktober 2026, BUG-044):
 * pola yang sama dengan empat menu ekspor lain di repo, `aria-haspopup="menu"`
 * + `aria-expanded`.
 */
describe.each([
  ['SurveyResultExportMenu', () => <SurveyResultExportMenu onExport={jest.fn()} />, /ekspor hasil/i],
  ['KabDashboardHeader', () => <KabDashboardHeader summary={null} />, /ekspor laporan tahunan/i],
])('%s — tombol Ekspor', (_, sajikan, nama) => {
  it('aria-haspopup menu, aria-expanded mengikuti panel', () => {
    render(sajikan());
    const tombol = screen.getByRole('button', { name: nama });

    expect(tombol).toHaveAttribute('aria-haspopup', 'menu');
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(tombol);
    expect(tombol).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(tombol);
    expect(tombol).toHaveAttribute('aria-expanded', 'false');
  });
});
