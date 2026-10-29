import fs from 'fs';
import path from 'path';

/**
 * Setiap CSV di apps/web disusun lewat `susunCsv`/`unduhCsv` (BUG-049,
 * 28 Oktober 2026).
 *
 * Penetralan sel berawalan `=`, `+`, `-`, `@` hanya ada di `utils/unduh.js`.
 * Tiga halaman daftar sebelumnya menyusun CSV-nya sendiri dengan salinan
 * `escape` + `downloadBlob`, sehingga perbaikan di satu tempat tak pernah
 * sampai ke sana. Pagar ini menolak penyusun CSV baru di luar berkas itu.
 */

const AKAR = path.resolve(__dirname, '../..');
const PINTU = path.join(AKAR, 'utils', 'unduh.js');

function berkasSumber(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entri) => {
    const penuh = path.join(dir, entri.name);
    if (entri.isDirectory()) {
      return entri.name === '__tests__' || entri.name === 'node_modules' ? [] : berkasSumber(penuh);
    }
    return /\.(js|jsx)$/.test(entri.name) ? [penuh] : [];
  });
}

const SEMUA = berkasSumber(AKAR);
const PENYUSUN_CSV = SEMUA.filter((berkas) =>
  /text\/csv/.test(fs.readFileSync(berkas, 'utf8')),
).map((berkas) => path.relative(AKAR, berkas).replace(/\\/g, '/'));

describe('CSV disusun di satu pintu', () => {
  it('KONTROL: penyisir menemukan pintunya sendiri', () => {
    expect(PENYUSUN_CSV).toContain('utils/unduh.js');
    expect(fs.existsSync(PINTU)).toBe(true);
  });

  it('tak ada berkas lain yang membuat blob text/csv', () => {
    // KabDashboardHeader dikecualikan: isinya empat label tetap dan angka
    // ringkasan, tanpa satu pun teks yang dapat diketik pengguna.
    const lain = PENYUSUN_CSV.filter(
      (b) =>
        b !== 'utils/unduh.js' &&
        b !== 'features/dashboard/components/kabupaten/KabDashboardHeader.jsx',
    );
    expect(lain).toEqual([]);
  });
});
