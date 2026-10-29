import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SurveyFilterBar from '../SurveyFilterBar';
import ComplaintFilterBar from '@/features/complaints/components/admin-kab/ComplaintFilterBar';

/**
 * Tombol "Filter" ponsel di bilah penyaring Admin Kabupaten mengumumkan
 * keadaannya (27 Oktober 2026, BUG-044). Panel penyaringnya selalu ada di DOM
 * (`hidden md:grid` sampai dibuka), jadi `aria-controls` dapat diperiksa
 * sebelum maupun sesudah dibuka.
 */
const OPD = [{ value: '', label: 'Semua OPD' }];

describe.each([
  [
    'SurveyFilterBar',
    () => (
      <SurveyFilterBar
        filters={{ search: '', opd: '', status: '', periode: '' }}
        onFilterChange={jest.fn()}
        onResetFilters={jest.fn()}
        opdOptions={OPD}
        tahunOptions={[{ value: '2026', label: '2026' }]}
      />
    ),
  ],
  [
    'ComplaintFilterBar',
    () => (
      <ComplaintFilterBar
        filters={{ search: '', opd: '', status: '', kategori: '' }}
        onFilterChange={jest.fn()}
        onResetFilters={jest.fn()}
        opdOptions={OPD}
        categoryOptions={[{ value: '', label: 'Semua Kategori' }]}
      />
    ),
  ],
])('%s — tombol Filter ponsel', (_, sajikan) => {
  it('aria-expanded mengikuti panel', () => {
    render(sajikan());
    const tombol = screen.getByRole('button', { name: 'Filter' });

    expect(tombol).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(tombol);
    expect(tombol).toHaveAttribute('aria-expanded', 'true');
  });

  it('aria-controls menunjuk panel penyaring', () => {
    render(sajikan());
    const tombol = screen.getByRole('button', { name: 'Filter' });
    const panel = document.getElementById(tombol.getAttribute('aria-controls') ?? '');

    expect(panel).not.toBeNull();
    expect(panel.className).toMatch(/hidden md:grid/);
    fireEvent.click(tombol);
    expect(panel.className).not.toMatch(/hidden/);
  });
});
