import fs from 'fs';
import path from 'path';

/**
 * Tak ada garis dua (--) pada teks yang ditampilkan ke halaman
 * (permintaan pengguna, 7 Oktober 2026).
 *
 * Penjaga menyeluruh, bukan satu uji per kalimat: yang diminta adalah aturan
 * atas SELURUH teks tampil, dan uji per kalimat hanya menjaga kalimat yang
 * kebetulan saya ingat. Penyisiran pertama menemukan sembilan untai tersebar di
 * enam berkas; sebagian tak akan ketemu dengan membaca halaman satu per satu.
 *
 * DUA hal sengaja dibiarkan, dan keduanya bukan tanda baca:
 *  - nama properti CSS (`--tinggi-navbar-kab`, `--font-poppins`): itu sintaks,
 *    membuangnya mematikan tata letak;
 *  - komentar kode: tak pernah sampai ke halaman.
 *
 * Komentar DIKOSONGKAN dengan spasi sebanyak karakternya, bukan dibuang, supaya
 * nomor baris yang dilaporkan tetap sejajar dengan berkas aslinya. Versi
 * pertama penyisir ini mengganti komentar blok dengan satu spasi dan melaporkan
 * nomor baris yang meleset jauh.
 */

const AKAR = path.resolve(__dirname, '..');
const EKSTENSI = ['.jsx', '.js', '.ts'];
const VAR_CSS = /--[a-z][a-z0-9-]*/g;
const BARIS_BARU = String.fromCharCode(10);

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
    if (/\.(test|spec)\.(jsx?|ts)$/.test(entri.name)) return [];
    return [penuh];
  });
}

describe('teks yang ditampilkan', () => {
  it('tidak memuat garis dua di mana pun', () => {
    const temuan = [];

    for (const berkas of berkasSumber(AKAR)) {
      const baris = kosongkanKomentar(fs.readFileSync(berkas, 'utf8')).split(BARIS_BARU);
      baris.forEach((isiBaris, i) => {
        if (!isiBaris.includes('--')) return;
        if (!isiBaris.replace(VAR_CSS, '').includes('--')) return;
        temuan.push(`${path.relative(AKAR, berkas)}:${i + 1}: ${isiBaris.trim()}`);
      });
    }

    expect(temuan).toEqual([]);
  });
});
