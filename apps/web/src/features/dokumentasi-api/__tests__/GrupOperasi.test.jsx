import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import GrupOperasi from '../components/GrupOperasi';
import { adaptOpenApi } from '../adapters/openapi.adapter';
import { dokumenOpenApi } from '../__fixtures__/openapi.fixture';

const grup = () => adaptOpenApi(dokumenOpenApi)[0];

/**
 * Grup dapat dilipat karena dokumen sungguhan memuat 15 tag dan 65 operasi
 * (diukur lewat peramban 5 Oktober 2026, sesudah endpoint ini sendiri masuk ke
 * dalam dokumen; pengukuran sebelumnya, 14 tag dan 64 operasi, diambil sebelum
 * itu). Semuanya terbentang sekaligus membuat halaman
 * menjadi gulir panjang tanpa gambaran keseluruhan.
 *
 * Keadaan buka-tutup DIANGKAT ke layar, bukan disimpan di sini: pencarian
 * perlu membuka grup yang cocok dan tombol "Buka semua" perlu membuka
 * semuanya, dua hal yang tak dapat dilakukan komponen ini sendiri.
 */
describe('GrupOperasi', () => {
  it('menampilkan nama tag dan jumlah endpoint tanpa menggambar isinya', () => {
    const g = grup();
    render(<GrupOperasi tag={g.tag} operasi={g.operasi} dibuka={false} onToggle={() => {}} />);

    expect(screen.getByText('surveys')).toBeInTheDocument();
    expect(screen.getByText('4 endpoint')).toBeInTheDocument();
    expect(screen.queryByText('Buat paket survei (Admin OPD).')).not.toBeInTheDocument();
  });

  it('menggambar operasi hanya saat dibuka', () => {
    const g = grup();
    render(<GrupOperasi tag={g.tag} operasi={g.operasi} dibuka onToggle={() => {}} />);

    expect(screen.getByText('Buat paket survei (Admin OPD).')).toBeInTheDocument();
    expect(screen.getByText('Detail satu survei.')).toBeInTheDocument();
  });

  /**
   * `aria-expanded` bukan hiasan: tanpa itu pembaca layar mengumumkan tombol
   * tanpa memberi tahu bahwa ada isi yang tersembunyi di baliknya.
   */
  it('mengumumkan keadaan buka-tutup dan melaporkan klik ke induknya', () => {
    const g = grup();
    const onToggle = jest.fn();
    render(<GrupOperasi tag={g.tag} operasi={g.operasi} dibuka={false} onToggle={onToggle} />);

    const tombol = screen.getByRole('button', { name: /grup surveys/i });
    expect(tombol).toHaveAttribute('aria-expanded', 'false');

    fireEvent.click(tombol);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('menandai aria-expanded true saat grup terbuka', () => {
    const g = grup();
    render(<GrupOperasi tag={g.tag} operasi={g.operasi} dibuka onToggle={() => {}} />);

    expect(screen.getByRole('button', { name: /grup surveys/i })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });
});
