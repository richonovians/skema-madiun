import React from 'react';
import { render, screen } from '@testing-library/react';
import Input from '../Input';
import Textarea from '../Textarea';

/**
 * Prop `error` pada `Input` dan `Textarea` (17 November 2026, BUG-083).
 *
 * Pesannya harus terbaca dua cara: terlihat di bawah medan, dan diumumkan
 * pembaca layar lewat `aria-describedby`. Warna merah saja tak cukup.
 */
describe.each([
  ['Input', Input],
  ['Textarea', Textarea],
])('%s — prop error', (_nama, Komponen) => {
  it('menampilkan pesan dan menandai medannya tidak sah', () => {
    render(<Komponen label="Judul Laporan" id="title" error="Tuliskan judul laporan." />);

    const medan = screen.getByLabelText('Judul Laporan');
    expect(screen.getByText('Tuliskan judul laporan.')).toBeInTheDocument();
    expect(medan).toHaveAttribute('aria-invalid', 'true');
    expect(medan).toHaveAccessibleDescription('Tuliskan judul laporan.');
  });

  it('KONTROL: tanpa error tak ada pesan dan tak ada aria-invalid', () => {
    render(<Komponen label="Judul Laporan" id="title" />);

    const medan = screen.getByLabelText('Judul Laporan');
    expect(medan).not.toHaveAttribute('aria-invalid');
    expect(medan).not.toHaveAttribute('aria-describedby');
  });

  it('aria-describedby milik pemanggil tetap dipertahankan bersama pesan galat', () => {
    render(
      <>
        <p id="bantuan">Ringkasan singkat.</p>
        <Komponen
          label="Judul Laporan"
          id="title"
          aria-describedby="bantuan"
          error="Tuliskan judul laporan."
        />
      </>,
    );

    expect(screen.getByLabelText('Judul Laporan')).toHaveAccessibleDescription(
      'Ringkasan singkat. Tuliskan judul laporan.',
    );
  });
});
