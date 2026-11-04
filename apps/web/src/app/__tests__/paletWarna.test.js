import fs from 'fs';
import path from 'path';

/**
 * Palet mengikuti logo SKEMA (4 November 2026): navy, biru, dan cyan diambil
 * dari piksel logonya. Hanya navy yang cukup gelap untuk teks biasa di atas
 * putih; biru (3,34:1) dan cyan (1,83:1) tidak.
 *
 * Uji ini membaca globals.css sebagai teks karena jsdom tidak memuat CSS:
 * pasangan warna yang tak terbaca tak akan membuat uji komponen mana pun merah.
 */
const css = fs.readFileSync(path.join(__dirname, '..', 'globals.css'), 'utf8');

const token = (nama) => {
  const cocok = css.match(new RegExp(`--color-${nama}:\\s*(#[0-9a-fA-F]{6})`));
  if (!cocok) throw new Error(`token --color-${nama} tidak ada di globals.css`);
  return cocok[1].toUpperCase();
};

const luminans = (hex) => {
  const kanal = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r, g, b] = kanal.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const kontras = (a, b) => {
  const [terang, gelap] = [luminans(a), luminans(b)].sort((x, y) => y - x);
  return (terang + 0.05) / (gelap + 0.05);
};

describe('palet warna mengikuti logo', () => {
  it('memakai warna logo sebagai token merek', () => {
    expect(token('primary')).toBe('#153969');
    expect(token('brand-blue')).toBe('#4493CC');
    expect(token('brand-cyan')).toBe('#58CFE3');
  });

  it('menimpa skala blue bawaan Tailwind dengan warna logo', () => {
    expect(token('blue-500')).toBe('#4493CC');
    expect(token('blue-900')).toBe('#153969');
  });

  it('menimpa skala indigo dengan keluarga cyan logo', () => {
    expect(token('indigo-400')).toBe('#58CFE3');
  });
});

describe('pasangan teks dan latar memenuhi AA 4,5:1', () => {
  const PUTIH = '#FFFFFF';

  it.each([
    ['primary', PUTIH],
    ['on-primary', 'primary'],
    ['outline-variant', 'primary'],
    ['brand-cyan', 'primary'],
    ['on-primary', 'primary-hover'],
    ['on-primary-container', 'primary-container'],
    ['on-primary-fixed-variant', 'primary-fixed'],
    ['on-secondary', 'secondary'],
    ['on-secondary-container', 'secondary-container'],
    ['on-surface-variant', 'surface-container'],
    ['inverse-on-surface', 'inverse-surface'],
    ['blue-400', 'inverse-surface'],
    ['blue-600', PUTIH],
    ['blue-600', 'blue-50'],
    ['blue-700', 'blue-50'],
    ['blue-700', 'blue-100'],
    ['blue-800', 'blue-100'],
    ['indigo-600', 'indigo-50'],
    ['indigo-800', 'indigo-100'],
    ['indigo-950', 'indigo-50'],
  ])('%s di atas %s', (teks, latar) => {
    const warna = (nama) => (nama.startsWith('#') ? nama : token(nama));
    expect(kontras(warna(teks), warna(latar))).toBeGreaterThanOrEqual(4.5);
  });
});
