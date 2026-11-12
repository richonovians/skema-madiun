import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

/**
 * `scripts/cadangan.cjs` saat GAGAL (BUG-073, 12 November 2026).
 *
 * Sejak cadangan dijalankan terjadwal oleh API, kegagalan tak lagi ditonton
 * operator yang dapat membersihkan sendiri. Folder `skm-<stempel>` yang
 * tertinggal setengah jadi terbaca sebagai cadangan sah oleh siapa pun yang
 * kelak memulihkan, dan retensi menghitungnya sebagai salah satu cadangan.
 *
 * Gagalnya dipaksa tanpa basis data sama sekali: `pg_dump` dipaksa dari PATH
 * yang kosong, jadi `spawn` menjawab ENOENT. Tak ada yang ditulis ke Postgres
 * mana pun.
 */
const SKRIP = path.resolve(__dirname, 'cadangan.cjs');
const KUNCI_UJI = 'ab'.repeat(32);

describe('cadangan.cjs saat gagal', () => {
  let keluar: string;

  beforeEach(() => {
    keluar = fs.mkdtempSync(path.join(os.tmpdir(), 'cadangan-uji-'));
  });

  afterEach(() => {
    fs.rmSync(keluar, { recursive: true, force: true });
  });

  it('keluar dengan kode 1 dan tidak meninggalkan folder cadangan setengah jadi', () => {
    const hasil = spawnSync(process.execPath, [SKRIP, '--keluar', keluar], {
      encoding: 'utf8',
      env: {
        DATABASE_URL: 'postgresql://uji:uji@127.0.0.1:1/uji',
        BACKUP_ENCRYPTION_KEY: KUNCI_UJI,
        DATA_ENCRYPTION_KEY: KUNCI_UJI,
        BACKUP_PG_DUMP_MODE: 'local',
        PATH: '',
        SystemRoot: process.env.SystemRoot ?? '',
      },
    });

    expect(hasil.status).toBe(1);
    expect(hasil.stderr).toMatch(/GAGAL/);
    expect(fs.readdirSync(keluar)).toEqual([]);
  });
});
