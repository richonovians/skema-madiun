import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import SurveyFilter from '../SurveyFilter';

/**
 * LABEL "SEMUA SURVEI" (1 Oktober 2026, permintaan pengguna: "ubah tombol
 * 'semua' menjadi 'semua survei'").
 *
 * JEBAKAN YANG DIJAGA BERKAS INI: kata 'Semua' dipakai DUA KALI dengan arti
 * berbeda di komponen yang sama -- sebagai teks tombol, DAN sebagai nilai
 * state (`activeCategory === 'Semua'`, `onCategoryChange('Semua')`, dibaca juga
 * oleh app/(respondent)/surveys/page.jsx). Mengganti keduanya sekaligus akan
 * mematikan penyaringnya tanpa satu pun uji lama memerah, sebab tak ada yang
 * memeriksa nilai yang dikirim.
 *
 * Karena itu yang diuji di sini BUKAN hanya labelnya, melainkan bahwa nilainya
 * TIDAK ikut berubah.
 */
const render1 = (props = {}) =>
  render(
    <SurveyFilter
      searchQuery=""
      onSearchChange={jest.fn()}
      activeCategory="Semua"
      onCategoryChange={jest.fn()}
      categories={['Pendidikan']}
      {...props}
    />,
  );

describe('SurveyFilter — tombol Semua Survei', () => {
  it('labelnya berbunyi "Semua Survei"', () => {
    render1();

    expect(screen.getByRole('button', { name: 'Semua Survei' })).toBeInTheDocument();
  });

  it('KONTROL: nilai yang dikirim TETAP "Semua", bukan ikut berubah', () => {
    const onCategoryChange = jest.fn();
    render1({ onCategoryChange });

    fireEvent.click(screen.getByRole('button', { name: 'Semua Survei' }));

    expect(onCategoryChange).toHaveBeenCalledWith('Semua');
  });

  it('KONTROL: keadaan aktifnya tetap dikenali dari nilai "Semua"', () => {
    // Bila nilai pembandingnya ikut diganti, tombolnya tak akan pernah terlihat
    // aktif meskipun penyaringnya sedang menampilkan seluruh survei.
    render1({ activeCategory: 'Semua' });

    const tombol = screen.getByRole('button', { name: 'Semua Survei' });
    expect(tombol.className).not.toMatch(/bg-surface\b/);
  });
});
