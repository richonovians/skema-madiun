import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import FAQSection from '../FAQSection';
import { aboutContent } from '../../constants/aboutContent';

/**
 * Akordeon FAQ halaman Tentang mengumumkan keadaannya (27 Oktober 2026,
 * BUG-044): tiap tombol pertanyaan membawa `aria-expanded` dan `aria-controls`
 * ke panel jawabannya. Panel yang tertutup hanya dikecilkan ke `max-h-0
 * opacity-0` -- teksnya tetap di DOM -- jadi ia juga disembunyikan dari pembaca
 * layar selagi tertutup.
 */
const [PERTAMA, KEDUA] = aboutContent.faq;
const tombol = (item) => screen.getByRole('button', { name: item.question });
const panel = (item) => document.getElementById(tombol(item).getAttribute('aria-controls') ?? '');

describe('FAQSection — akordeon', () => {
  it('semua tertutup di awal', () => {
    render(<FAQSection />);

    for (const item of aboutContent.faq) {
      expect(tombol(item)).toHaveAttribute('aria-expanded', 'false');
    }
  });

  it('aria-controls menunjuk panel jawabannya sendiri', () => {
    render(<FAQSection />);

    expect(panel(PERTAMA)).toHaveTextContent(PERTAMA.answer);
    expect(panel(KEDUA)).toHaveTextContent(KEDUA.answer);
  });

  it('membuka satu menutup yang lain; panel tertutup tersembunyi', () => {
    render(<FAQSection />);

    fireEvent.click(tombol(PERTAMA));
    expect(tombol(PERTAMA)).toHaveAttribute('aria-expanded', 'true');
    expect(panel(PERTAMA)).not.toHaveAttribute('aria-hidden', 'true');
    expect(panel(KEDUA)).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(tombol(KEDUA));
    expect(tombol(PERTAMA)).toHaveAttribute('aria-expanded', 'false');
    expect(tombol(KEDUA)).toHaveAttribute('aria-expanded', 'true');
    expect(panel(PERTAMA)).toHaveAttribute('aria-hidden', 'true');
  });
});
