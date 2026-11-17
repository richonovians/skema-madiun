import { PrismaClient } from '@prisma/client';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Readable } from 'node:stream';
import {
  gantiNamaBasisData,
  pastikanHostLokal,
  pecahUrlPostgres,
} from '../scripts/lib/url-postgres';

/* eslint-disable @typescript-eslint/no-require-imports */
const { enkripsiAliran } = require('../scripts/lib/aliran-kripto.cjs') as {
  enkripsiAliran: (
    sumber: Readable,
    tujuan: string,
    kunci: Buffer,
    info: string,
  ) => Promise<number>;
};
const { INFO_CADANGAN } = require('../scripts/lib/envelope.cjs') as { INFO_CADANGAN: string };
/* eslint-enable @typescript-eslint/no-require-imports */

/**
 * `pnpm pulihkan` ke basis data yang BELUM ADA (BUG-074, 17 November 2026).
 *
 * Penjaga "tujuan tak boleh berisi tabel" dulu menyambung ke basis data tujuan
 * itu sendiri untuk menghitung tabelnya. Tujuan yang belum dibuat -- bentuk
 * paling wajar bagi pemulihan ke tempat baru -- dijawab Postgres
 * `FATAL: database "..." does not exist`, dan skrip berhenti sebelum
 * mendekripsi apa pun. Runbook tak menyebut langkah `CREATE DATABASE`.
 *
 * TUJUANNYA SEKALI PAKAI, bukan `skm_uji` atau `skm_db`. Namanya berawalan
 * `skm_pulih_uji_` dan berstempel waktu, dipastikan belum ada sebelum skrip
 * berjalan, dan dibuang di `afterAll`. Server-nya server `DATABASE_URL` milik
 * pelari e2e, yang sudah ditolak bila bukan localhost; uji ini memeriksanya
 * sekali lagi karena ia membuat dan membuang basis data.
 *
 * Dump-nya dua pernyataan buatan uji, dienkripsi dengan amplop beraliran yang
 * sama dengan `pnpm cadangan`, jadi jalur dekripsi skripnya ikut teruji.
 */
const SKRIP = path.resolve(__dirname, '..', 'scripts', 'pulihkan.cjs');
const KUNCI_UJI = 'cd'.repeat(32);
const URL_UJI = process.env.DATABASE_URL ?? '';
const TUJUAN = `skm_pulih_uji_${Date.now()}`;

describe('pulihkan.cjs ke basis data yang belum ada (BUG-074)', () => {
  const prisma = new PrismaClient();
  let dirCadangan: string;

  beforeAll(async () => {
    pastikanHostLokal(URL_UJI);
    expect(pecahUrlPostgres(URL_UJI).nama).not.toBe(TUJUAN);
    const ada = await prisma.$queryRaw<
      unknown[]
    >`SELECT 1 FROM pg_database WHERE datname = ${TUJUAN}`;
    expect(ada).toHaveLength(0);

    dirCadangan = fs.mkdtempSync(path.join(os.tmpdir(), 'pulihkan-e2e-'));
    const sql =
      'CREATE TABLE uji_pulih (id integer PRIMARY KEY, teks text NOT NULL);\n' +
      "INSERT INTO uji_pulih VALUES (1, 'satu'), (2, 'dua');\n";
    await enkripsiAliran(
      Readable.from([sql]),
      path.join(dirCadangan, 'dump.sql.enc'),
      Buffer.from(KUNCI_UJI, 'hex'),
      INFO_CADANGAN,
    );
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DROP DATABASE IF EXISTS "${TUJUAN}" WITH (FORCE)`);
    await prisma.$disconnect();
    fs.rmSync(dirCadangan, { recursive: true, force: true });
  });

  it('membuat basis data tujuan lalu memulihkan dump ke dalamnya', async () => {
    const hasil = spawnSync(process.execPath, [SKRIP, '--dari', dirCadangan, '--db', TUJUAN], {
      encoding: 'utf8',
      env: { ...process.env, DATABASE_URL: URL_UJI, BACKUP_ENCRYPTION_KEY: KUNCI_UJI },
    });

    expect(hasil.stderr).not.toMatch(/GAGAL/);
    expect(hasil.status).toBe(0);
    expect(hasil.stdout).toMatch(new RegExp(`"${TUJUAN}" belum ada; dibuat`));

    const pulihan = new PrismaClient({ datasourceUrl: gantiNamaBasisData(URL_UJI, TUJUAN) });
    try {
      const baris = await pulihan.$queryRaw<{ id: number; teks: string }[]>`
        SELECT id, teks FROM uji_pulih ORDER BY id`;
      expect(baris).toEqual([
        { id: 1, teks: 'satu' },
        { id: 2, teks: 'dua' },
      ]);
    } finally {
      await pulihan.$disconnect();
    }
  });
});
