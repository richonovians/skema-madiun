import fs from 'fs';
import path from 'path';

/**
 * `tailwind-merge` hanya diimpor oleh `utils/cn.js` (27 Oktober 2026).
 *
 * `twMerge` polos tidak mengenal token tema di `globals.css`: `px-sm` tak
 * menimpa `px-3`, dan `text-label-md` ia kira warna sehingga warna teks yang
 * sah dibuang. Delapan berkas memakainya langsung sebelum `cn` lahir. Tak satu
 * pun pemanggilnya hari ini memicu jebakan itu, tetapi tak ada yang memerah
 * bila kelak ada -- penyisir inilah yang memerah.
 */

const AKAR = path.resolve(__dirname, '..');
const IZIN = path.join('utils', 'cn.js');

function berkasSumber(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entri) => {
    const penuh = path.join(dir, entri.name);
    if (entri.isDirectory()) {
      return entri.name === '__tests__' || entri.name === 'node_modules' ? [] : berkasSumber(penuh);
    }
    return /\.jsx?$/.test(entri.name) ? [penuh] : [];
  });
}

describe('penggabung kelas', () => {
  it('tidak ada yang mengimpor tailwind-merge selain utils/cn.js', () => {
    const temuan = berkasSumber(AKAR)
      .filter((berkas) => path.relative(AKAR, berkas) !== IZIN)
      .filter((berkas) => /from\s+['"]tailwind-merge['"]/.test(fs.readFileSync(berkas, 'utf8')))
      .map((berkas) => path.relative(AKAR, berkas));

    expect(temuan).toEqual([]);
  });
});
