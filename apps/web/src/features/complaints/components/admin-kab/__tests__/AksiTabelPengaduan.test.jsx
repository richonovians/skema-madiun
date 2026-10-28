import React from 'react';
import { render, screen } from '@testing-library/react';
import ComplaintTable from '../ComplaintTable';

/**
 * Kolom AKSI daftar pengaduan Admin Kabupaten (28 Oktober 2026).
 *
 * Putaran penuh Playwright 27 Oktober memerahkan sasaran sentuh di 390px:
 * "Teruskan" 95x29, di bawah 44px. "Monitor Tiket" berkelas sama dan lolos
 * hanya karena teksnya patah dua baris. Keduanya kini `min-h-[44px]`, konvensi
 * yang sama dengan bilah penyaring di samping tabel ini.
 *
 * "Monitor Tiket" dulu `<button>` di dalam `<Link>`: kendali interaktif di dalam
 * kendali interaktif, susunan yang tak sah. Kini tautannya sendiri yang bergaya
 * tombol.
 */
const baris = (over = {}) => ({
  id: 'PGD20261028AAAA',
  opdId: null,
  target: null,
  kategori: 'lainnya',
  title: 'Tidak tahu harus ke mana',
  reporter: { name: 'Warga Contoh' },
  dateStr: '28 Okt 2026',
  ageDays: 0,
  status: 'Diterima',
  ...over,
});

describe('ComplaintTable — kolom aksi', () => {
  it('Monitor Tiket: tautan ke detail tiket, tanpa tombol di dalamnya', () => {
    render(<ComplaintTable complaints={[baris()]} onForward={jest.fn()} />);

    const tautan = screen.getByRole('link', { name: 'Monitor Tiket' });
    expect(tautan).toHaveAttribute('href', '/admin-kab/complaints/PGD20261028AAAA');
    expect(tautan.querySelector('button')).toBeNull();
    expect(screen.queryByRole('button', { name: 'Monitor Tiket' })).not.toBeInTheDocument();
  });

  it('kedua aksi bersasaran sentuh 44px', () => {
    render(<ComplaintTable complaints={[baris()]} onForward={jest.fn()} />);

    expect(screen.getByRole('link', { name: 'Monitor Tiket' })).toHaveClass('min-h-[44px]');
    expect(screen.getByRole('button', { name: 'Teruskan' })).toHaveClass('min-h-[44px]');
  });

  it('Teruskan bertipe button', () => {
    render(<ComplaintTable complaints={[baris()]} onForward={jest.fn()} />);

    expect(screen.getByRole('button', { name: 'Teruskan' })).toHaveAttribute('type', 'button');
  });
});
