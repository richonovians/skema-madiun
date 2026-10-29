import fs from 'fs';
import path from 'path';

/**
 * Lencana yang mengganti ukuran hurufnya dengan nilai arbitrer (`text-[10px]`)
 * wajib menyatakan jarak barisnya sendiri (27 Oktober 2026).
 *
 * Badge membawa `text-xs`, yang memasang ukuran huruf SEKALIGUS jarak baris
 * (`--text-xs--line-height`, 1,333). Sejak Badge memakai `cn` (BUG-041),
 * `text-[10px]` dari pemanggil membuang `text-xs` utuh, termasuk jarak
 * barisnya, sehingga jarak baris jatuh ke warisan 1,5: lencana tumbuh 2px
 * (17 -> 19, 21 -> 23), terukur di Chrome. Ukuran arbitrer tak membawa jarak
 * baris, jadi pemanggilnya yang harus menyebutkannya.
 *
 * Dipasang di pemanggil, bukan di Badge: tailwind-merge membuang `leading-*`
 * bawaan begitu ada kelas ukuran huruf sesudahnya.
 */

const AKAR = path.resolve(__dirname, '../../..');

function berkasSumber(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entri) => {
    const penuh = path.join(dir, entri.name);
    if (entri.isDirectory()) {
      return entri.name === '__tests__' || entri.name === 'node_modules' ? [] : berkasSumber(penuh);
    }
    return /\.jsx$/.test(entri.name) ? [penuh] : [];
  });
}

/** className tiap `<Badge` -- hanya dari tag pembukanya, bukan dari anaknya. */
function kelasLencana(sumber) {
  const hasil = [];
  let i = sumber.indexOf('<Badge');
  while (i >= 0) {
    const sisa = sumber.slice(i + '<Badge'.length);
    const anak = sisa.search(/<[A-Za-z/]/);
    const tag = anak < 0 ? sisa : sisa.slice(0, anak);
    const cocok = tag.match(/className=(?:"([^"]*)"|\{`([^`]*)`\})/);
    if (cocok) hasil.push(cocok[1] ?? cocok[2]);
    i = sumber.indexOf('<Badge', i + 1);
  }
  return hasil;
}

const LENCANA = berkasSumber(AKAR).flatMap((berkas) =>
  kelasLencana(fs.readFileSync(berkas, 'utf8')).map((kelas) => ({
    berkas: path.relative(AKAR, berkas),
    kelas,
  })),
);
const BERUKURAN_ARBITRER = LENCANA.filter(({ kelas }) => /(^|\s)text-\[/.test(kelas));

describe('Badge berukuran huruf arbitrer', () => {
  it('KONTROL: penyisir menemukan lencana yang dimaksud', () => {
    expect(BERUKURAN_ARBITRER.length).toBeGreaterThanOrEqual(7);
  });

  it('menyatakan jarak barisnya sendiri', () => {
    const tanpaJarak = BERUKURAN_ARBITRER.filter(({ kelas }) => !/(^|\s)leading-/.test(kelas));
    expect(tanpaJarak).toEqual([]);
  });
});
