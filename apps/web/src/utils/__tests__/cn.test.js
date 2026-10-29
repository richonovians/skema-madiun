import fs from 'fs';
import path from 'path';
import { cn } from '../cn';

/**
 * `cn` = clsx + tailwind-merge yang MENGENAL token tema repo ini (27 Oktober
 * 2026). tailwind-merge polos tidak tahu `--spacing-*` dan `--text-*` di
 * `globals.css`: `px-sm` tidak menimpa `px-3` (keduanya terpasang, urutan CSS
 * yang menentukan), dan `text-label-md` dikira WARNA sehingga warna teks yang
 * sah ikut dibuang.
 */

const GLOBALS = path.resolve(__dirname, '../../app/globals.css');

function tokenTema(awalan) {
  const css = fs.readFileSync(GLOBALS, 'utf8');
  const pola = new RegExp(`^\\s*--${awalan}-([a-z0-9-]+):`, 'gm');
  const hasil = new Set();
  for (const cocok of css.matchAll(pola)) {
    // `--text-h1--line-height` dan kawannya adalah pengubah, bukan token.
    if (!cocok[1].includes('--')) hasil.add(cocok[1].replace(/-$/, ''));
  }
  return [...hasil];
}

describe('cn', () => {
  it('token spasi tema menimpa skala bawaan', () => {
    expect(cn('px-3 py-1', 'px-sm')).toBe('py-1 px-sm');
  });

  it('token teks tema dibaca sebagai ukuran huruf, bukan warna', () => {
    expect(cn('text-xs text-on-surface-variant', 'text-label-md')).toBe(
      'text-on-surface-variant text-label-md',
    );
  });

  it('className pemanggil menang atas sudut bawaan', () => {
    expect(cn('rounded-full px-3', 'rounded')).toBe('px-3 rounded');
  });

  it('meneruskan perilaku clsx: nilai palsu dibuang', () => {
    expect(cn('a', false, null, undefined, { b: true, c: false })).toBe('a b');
  });

  it('SETIAP token --spacing-* di globals.css dikenali', () => {
    const token = tokenTema('spacing');
    expect(token.length).toBeGreaterThan(5);
    const gagal = token.filter((t) => cn('px-3', `px-${t}`) !== `px-${t}`);
    expect(gagal).toEqual([]);
  });

  it('SETIAP token --text-* di globals.css dikenali sebagai ukuran huruf', () => {
    const token = tokenTema('text');
    expect(token.length).toBeGreaterThan(10);
    const gagal = token.filter(
      (t) => cn('text-xs text-primary', `text-${t}`) !== `text-primary text-${t}`,
    );
    expect(gagal).toEqual([]);
  });
});
