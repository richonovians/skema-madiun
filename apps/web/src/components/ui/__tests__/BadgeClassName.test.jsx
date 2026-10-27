import { render, screen } from '@testing-library/react';
import Badge from '../Badge';

/**
 * `className` pemanggil harus MENANG atas kelas bawaan Badge (27 Oktober 2026).
 * Sebelumnya kelas dirangkai sebagai string biasa, sehingga `rounded` yang
 * diminta enam lencana survei kalah oleh `rounded-full` bawaan -- terukur di
 * Chrome 26 Oktober 2026 -- dan `px-sm` hidup berdampingan dengan `px-3`.
 */

function kelas(props) {
  render(<Badge {...props}>Lencana</Badge>);
  return screen.getByText('Lencana').className.split(/\s+/);
}

describe('Badge className', () => {
  it('rounded dari pemanggil menggantikan rounded-full', () => {
    const k = kelas({ className: 'rounded' });
    expect(k).toContain('rounded');
    expect(k).not.toContain('rounded-full');
  });

  it('token spasi tema menggantikan bantalan bawaan', () => {
    const k = kelas({ className: 'px-sm py-[2px]' });
    expect(k).toEqual(expect.arrayContaining(['px-sm', 'py-[2px]']));
    expect(k).not.toContain('px-3');
    expect(k).not.toContain('py-1');
  });

  it('warna dari pemanggil menggantikan warna varian', () => {
    const k = kelas({ variant: 'success', className: 'bg-surface-container-low text-on-surface-variant/40' });
    expect(k).toEqual(expect.arrayContaining(['bg-surface-container-low', 'text-on-surface-variant/40']));
    expect(k).not.toContain('bg-green-100');
    expect(k).not.toContain('text-green-800');
  });

  // Ukuran arbitrer membuang `text-xs` beserta jarak barisnya, jadi tujuh
  // pemanggil menyebut jarak barisnya sendiri (BadgeJarakBaris.test.js). Kelas
  // itu tak boleh ikut dibuang tailwind-merge.
  it('jarak baris dari pemanggil bertahan di samping ukuran huruf arbitrer', () => {
    const k = kelas({ className: 'text-[10px] leading-(--text-xs--line-height)' });
    expect(k).toEqual(expect.arrayContaining(['text-[10px]', 'leading-(--text-xs--line-height)']));
    expect(k).not.toContain('text-xs');
  });

  it('KONTROL: tanpa className, kelas bawaan utuh', () => {
    const k = kelas({ variant: 'success' });
    expect(k).toEqual(
      expect.arrayContaining(['rounded-full', 'px-3', 'py-1', 'text-xs', 'bg-green-100', 'text-green-800']),
    );
  });
});
