import fs from 'fs';
import path from 'path';

/**
 * Tahun hak cipta mengikuti tahun berjalan (30 Oktober 2026, permintaan
 * pengguna).
 *
 * Empat footer sudah memakai `new Date().getFullYear()`, tetapi empat tempat
 * lain memaku `© 2026` -- layar pengisian survei publik (tiga kali) dan
 * `DashboardFooter`. Tanpa penyisir ini satu tempat baru yang memaku tahun
 * tak akan memerah sampai Januari, saat footernya tiba-tiba tampak basi.
 *
 * Komentar dikosongkan lebih dulu (pola `tanpaMaxWTokenSpasi.test.js`).
 */

const AKAR = path.resolve(__dirname, '..');
const EKSTENSI = ['.jsx', '.js'];
const BARIS_BARU = String.fromCharCode(10);
const TAHUN_DIPAKU = /(©|&copy;)\s*(19|20)\d\d/;

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

describe('tahun hak cipta', () => {
  it('tidak dipaku pada tahun tertentu', () => {
    const temuan = [];

    for (const berkas of berkasSumber(AKAR)) {
      const baris = kosongkanKomentar(fs.readFileSync(berkas, 'utf8')).split(BARIS_BARU);
      baris.forEach((isiBaris, i) => {
        if (TAHUN_DIPAKU.test(isiBaris)) {
          temuan.push(`${path.relative(AKAR, berkas)}:${i + 1}: ${isiBaris.trim()}`);
        }
      });
    }

    expect(temuan).toEqual([]);
  });

  it('KONTROL: penyisirnya mengenali tahun dipaku dan meloloskan tahun berjalan', () => {
    expect(TAHUN_DIPAKU.test('© 2026 · SKEMA Madiun')).toBe(true);
    expect(TAHUN_DIPAKU.test('&copy; 2025 SKEMA')).toBe(true);
    expect(TAHUN_DIPAKU.test('© {new Date().getFullYear()} SKEMA Madiun')).toBe(false);
  });
});
