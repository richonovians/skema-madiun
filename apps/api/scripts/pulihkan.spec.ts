import { constants } from 'node:buffer';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { alirkanKeProses } = require('./pulihkan.cjs') as {
  alirkanKeProses: (
    berkas: string,
    perintah: string,
    arg: string[],
    env: NodeJS.ProcessEnv,
  ) => Promise<void>;
};

/**
 * Dump di atas batas panjang string Node (BUG-074, 17 November 2026).
 *
 * `pulihkan.cjs` dulu membaca seluruh dump hasil dekripsi menjadi satu string
 * lalu menyerahkannya ke `spawnSync({ input })`. Batas string Node 64-bit
 * `536.870.888` karakter, jadi dump di atas ~512 MiB ditolak
 * `ERR_STRING_TOO_LONG` -- sesudah dekripsi, sebelum satu pernyataan SQL pun
 * berjalan, persis pada hari pemulihan.
 *
 * Berkasnya satu bita di atas batas itu, dibuat dengan `truncate` sehingga tak
 * ada isi yang perlu ditulis. Penerimanya bukan `psql` melainkan Node yang
 * menghitung bita di stdin dan keluar 0 hanya bila jumlahnya utuh: yang diuji
 * di sini cara skrip menyuapkan berkas, bukan Postgres. Tak ada basis data yang
 * disentuh.
 */
const PENGHITUNG = [
  '-e',
  [
    'let n = 0;',
    "process.stdin.on('data', (d) => { n += d.length; });",
    "process.stdin.on('end', () => {",
    '  if (n === Number(process.argv[1])) process.exit(0);',
    '  process.stderr.write(`diterima ${n} bita`);',
    '  process.exit(1);',
    '});',
  ].join('\n'),
];

describe('pulihkan.cjs: alirkanKeProses', () => {
  let dir: string;

  beforeEach(() => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pulihkan-uji-'));
  });

  afterEach(() => {
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('menyuapkan dump yang melampaui batas panjang string Node secara utuh', async () => {
    const ukuran = constants.MAX_STRING_LENGTH + 1;
    const berkas = path.join(dir, 'dump.sql');
    fs.writeFileSync(berkas, '');
    fs.truncateSync(berkas, ukuran);

    await expect(
      alirkanKeProses(berkas, process.execPath, [...PENGHITUNG, String(ukuran)], process.env),
    ).resolves.toBeUndefined();
  }, 120_000);

  it('menolak dengan stderr proses bila proses keluar bukan 0', async () => {
    const berkas = path.join(dir, 'dump.sql');
    fs.writeFileSync(berkas, 'SELECT 1;\n');

    await expect(
      alirkanKeProses(berkas, process.execPath, [...PENGHITUNG, '999'], process.env),
    ).rejects.toThrow(/diterima 10 bita/);
  });
});
