/**
 * MENJALANKAN CLI PAKET DENGAN `DATABASE_URL` YANG DITENTUKAN.
 *
 * Dipisah dari `uji-e2e.ts` pada 13 Oktober 2026 karena pembangun dataset uji
 * beban menuntut hal yang sama. Yang dijaga di sini bukan kenyamanan melainkan
 * satu seluk-beluk yang sudah terbukti menggigit, dan menyalinnya berarti
 * dua tempat yang dapat menyimpang.
 *
 * CLI-nya dipanggil lewat `process.execPath` dan berkas masuk JS paketnya,
 * BUKAN lewat shim `.cmd` di `node_modules/.bin`. Shim itu menuntut
 * `shell: true` di Windows, dan shell lalu mengurai ulang argumennya -- jalur
 * repo ini memuat spasi, jadi itu rusak.
 *
 * Dan itu bukan satu-satunya alasan. Perintah yang mengandalkan PATH gagal di
 * luar pnpm: `prisma db seed` menjalankan perintah seednya lewat shell dan
 * jatuh dengan "'tsx' is not recognized as an internal or external command"
 * ketika skripnya dijalankan dengan cara lain. Memanggil berkas masuknya
 * langsung menghapus seluruh kelas kegagalan itu.
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';

const resolusi = createRequire(__filename);

/** Mengembalikan kode keluar CLI-nya. Melempar hanya bila prosesnya tak dapat dijalankan. */
export function jalankanCli(
  paket: string,
  argumen: string[],
  opsi: {
    cwd: string;
    databaseUrl: string;
    /**
     * Nama kunci di dalam `bin` paketnya, bila ia berbeda dari nama paketnya.
     * `typescript` memerlukannya: binernya bernama `tsc`, dan tanpa ini
     * `bin['typescript']` bernilai undefined.
     */
    namaBin?: string;
    /** Variabel lingkungan tambahan, di atas `DATABASE_URL`. */
    env?: Record<string, string>;
  },
): number {
  const hasil = spawnSync(
    process.execPath,
    [berkasMasukCli(paket, opsi.namaBin ?? paket), ...argumen],
    {
      cwd: opsi.cwd,
      stdio: 'inherit',
      env: { ...process.env, ...opsi.env, DATABASE_URL: opsi.databaseUrl },
    },
  );
  if (hasil.error) {
    throw hasil.error;
  }
  return hasil.status ?? 1;
}

function berkasMasukCli(paket: string, namaBin: string): string {
  const berkasPaket = resolusi.resolve(`${paket}/package.json`);
  const isi = resolusi(berkasPaket) as { bin: string | Record<string, string> };
  const entri = typeof isi.bin === 'string' ? isi.bin : isi.bin[namaBin];
  if (entri === undefined) {
    throw new Error(`Paket '${paket}' tak punya bin bernama '${namaBin}'.`);
  }
  return path.join(path.dirname(berkasPaket), entri);
}
