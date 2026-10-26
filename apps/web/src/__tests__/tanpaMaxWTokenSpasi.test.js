import fs from 'fs';
import path from 'path';

/**
 * Tak ada `max-w-xs|sm|md|lg|xl|2xl|3xl` di kode tampilan (27 Oktober 2026,
 * BUG-040).
 *
 * Tema di `globals.css` mendefinisikan `--spacing-xs` sampai `--spacing-3xl`,
 * dan Tailwind v4 memakai token spasi itu untuk `max-w-*`: `max-w-xs` bernilai
 * 4px, bukan 20rem; `max-w-2xl` 48px, bukan 42rem. CLAUDE.md sudah melarangnya
 * sejak 8 Oktober 2026, tetapi larangan tertulis tak memerah: terukur
 * 26 Oktober 2026, kolom judul Monitoring Survei diperas menjadi 86-121px oleh
 * `max-w-xs`, dan sesudah itu masih tersisa lima pemakaian lagi. jsdom tak
 * memuat CSS, jadi uji komponen mana pun tak dapat melihatnya; penyisir inilah
 * satu-satunya penjaga di luar Playwright.
 *
 * Komentar dikosongkan lebih dulu (pola `tanpaGarisDua.test.js`): beberapa
 * komentar menyebut nama kelas itu justru untuk memperingatkannya. Nilai
 * eksplisit seperti `max-w-[20rem]` tidak tersaring.
 */

const AKAR = path.resolve(__dirname, '..');
const EKSTENSI = ['.jsx', '.js'];
const BARIS_BARU = String.fromCharCode(10);
const TERBAJAK = /(?<![\w-])max-w-(xs|sm|md|lg|xl|2xl|3xl)(?![\w-])/;

function kosongkanKomentar(sumber) {
  const spasi = (cocok) => cocok.replace(/[^\n]/g, ' ');
  return sumber.replace(/\/\*[\s\S]*?\*\//g, spasi).replace(/\/\/[^\n]*/g, spasi);
}

function berkasSumber(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entri) => {
    const penuh = path.join(dir, entri.name);
    if (entri.isDirectory()) {
      return entri.name === '__tests__' || entri.name === 'node_modules' ? [] : berkasSumber(penuh);
    }
    if (!EKSTENSI.includes(path.extname(entri.name))) return [];
    if (/\.(test|spec)\.jsx?$/.test(entri.name)) return [];
    return [penuh];
  });
}

describe('lebar maksimum', () => {
  it('tidak memakai kelas max-w-* yang dibajak token spasi', () => {
    const temuan = [];

    for (const berkas of berkasSumber(AKAR)) {
      const baris = kosongkanKomentar(fs.readFileSync(berkas, 'utf8')).split(BARIS_BARU);
      baris.forEach((isiBaris, i) => {
        if (TERBAJAK.test(isiBaris)) {
          temuan.push(`${path.relative(AKAR, berkas)}:${i + 1}: ${isiBaris.trim()}`);
        }
      });
    }

    expect(temuan).toEqual([]);
  });

  it('KONTROL: penyisirnya mengenali kelas terlarang dan meloloskan nilai eksplisit', () => {
    expect(TERBAJAK.test('className="px-lg max-w-xs"')).toBe(true);
    expect(TERBAJAK.test('className="max-w-2xl mx-auto"')).toBe(true);
    expect(TERBAJAK.test('className="max-w-[20rem]"')).toBe(false);
    expect(TERBAJAK.test('className="max-w-4xl"')).toBe(false);
    expect(TERBAJAK.test('className="sm:max-w-xs-custom"')).toBe(false);
  });
});
