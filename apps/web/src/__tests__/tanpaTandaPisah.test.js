import fs from 'fs';
import path from 'path';

/**
 * Tak ada tanda pisah (— atau –) pada teks yang ditampilkan ke halaman
 * (permintaan pengguna, 10 November 2026).
 *
 * Saudara `tanpaGarisDua.test.js`, dengan cara kerja yang sama: satu penjaga
 * atas SELURUH teks tampil, bukan satu uji per kalimat. Penyisiran pertama
 * menemukan 31 untai di 15 berkas.
 *
 * Yang sengaja dibiarkan:
 *  - komentar kode: tak pernah sampai ke halaman;
 *  - tanda pisah TUNGGAL sebagai penanda sel kosong (`'—'`, `'–'`, atau teks
 *    JSX yang isinya hanya tanda itu). Itu data, bukan tanda baca: ia mengisi
 *    sel tabel yang nilainya tidak ada.
 *
 * Komentar dikosongkan dengan spasi sebanyak karakternya supaya nomor baris
 * yang dilaporkan tetap sejajar dengan berkas aslinya.
 */

const AKAR = path.resolve(__dirname, '..');
const EKSTENSI = ['.jsx', '.js', '.ts'];
const BARIS_BARU = String.fromCharCode(10);
const TANDA_PISAH = /[—–]/;
// `'—'`, `"–"`, atau `` `—` `` utuh sebagai satu literal.
const PENANDA_KOSONG_LITERAL = /(['"`])[—–]\1/g;
// Baris JSX yang isinya hanya tanda pisah, mis. `<td>—</td>` atau `—` sendirian.
const PENANDA_KOSONG_JSX = />\s*[—–]\s*</g;

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
  it('tidak memuat tanda pisah, kecuali penanda sel kosong', () => {
    const temuan = [];

    for (const berkas of berkasSumber(AKAR)) {
      const baris = kosongkanKomentar(fs.readFileSync(berkas, 'utf8')).split(BARIS_BARU);
      baris.forEach((isiBaris, i) => {
        if (!TANDA_PISAH.test(isiBaris)) return;
        const tanpaPenanda = isiBaris
          .replace(PENANDA_KOSONG_LITERAL, '')
          .replace(PENANDA_KOSONG_JSX, '><');
        if (tanpaPenanda.trim() === '' || /^[—–]$/.test(tanpaPenanda.trim())) return;
        if (!TANDA_PISAH.test(tanpaPenanda)) return;
        temuan.push(`${path.relative(AKAR, berkas)}:${i + 1}: ${isiBaris.trim()}`);
      });
    }

    expect(temuan).toEqual([]);
  });
});
