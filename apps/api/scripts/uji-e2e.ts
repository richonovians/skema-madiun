/**
 * PELARI UJI E2E — menyiapkan basis data uji, lalu menjalankan jest.
 *
 * MENGAPA ADA. Suite e2e `apps/api` menulis baris sungguhan, dan sampai sekarang
 * ia menulis ke basis data pengembangan yang sama yang dipakai aplikasi saat
 * `pnpm dev`. Akibatnya bukan dugaan: `test/opd.e2e-spec.ts` menyimpan lalu
 * memulihkan seluruh daftar OPD hanya karena satu kali jalan pernah
 * menonaktifkan 53 OPD hasil sinkronisasi sungguhan, dan itu baru terlihat
 * belakangan dari dropdown OPD yang kosong.
 *
 * MENGAPA BERUPA SKRIP, bukan sebaris `DATABASE_URL=... jest` di package.json.
 * Repo ini dikembangkan di Windows, dan PowerShell tak mengenal awalan variabel
 * lingkungan pada perintah. `cross-env` tidak ada di repo dan tak ditambahkan
 * hanya untuk ini. Jadi env-nya diatur di dalam Node, tempat ia berlaku sama di
 * mesin mana pun.
 *
 * MENGAPA MENYIAPKAN SENDIRI, bukan meminta tiap orang membuat basis datanya.
 * Tiap pengembang punya container dan volume Postgres sendiri, jadi `skm_uji`
 * tak muncul begitu saja di mesin mereka. SQL di `/docker-entrypoint-initdb.d`
 * tak menolong: ia hanya berjalan pada volume yang masih kosong, dan seisi tim
 * sudah punya data. Karena itu pelari ini yang membuat basis datanya dan
 * menerapkan migrasinya, keduanya idempoten. Tak ada langkah manual untuk
 * siapa pun, tak ada entri `.env` baru, dan migrasi baru ikut terpasang sendiri
 * tanpa ada yang perlu ingat menerapkannya dua kali.
 *
 * MENGAPA IKUT MEN-SEED. Delapan uji di `test/sso.e2e-spec.ts` menuntut OPD
 * ber-`external_id`, dan docblock di dalamnya menyatakan tersurat bahwa tanpa
 * baris itu ujinya harus terlihat GAGAL, bukan terlewat diam-diam. Di basis
 * data yang baru tak ada baris semacam itu. Seed-nya idempoten dan selesai
 * dalam sekitar satu detik, jadi ia dijalankan setiap kali: itu menjaga nol
 * langkah manual bagi seisi tim sekaligus membuat basis data uji menyerupai
 * basis data pengembangan, tempat 40 suite ini selama ini hijau.
 *
 * Yang TIDAK diperbaiki oleh seed, dan pantas diketahui: seed tak pernah
 * menghasilkan pengguna ber-id 1. Uji yang mengandalkan baku `x-dev-user-id`
 * = 1 lulus di basis data pengembangan hanya karena kebetulan sejarah -- id 1
 * di sana adalah baris pengguna pertama yang pernah dibuat. Uji semacam itu
 * harus membawa penggunanya sendiri.
 *
 * Pemakaiannya tidak berubah:
 *
 *   pnpm --filter @skm-spm/api test:e2e
 *   pnpm --filter @skm-spm/api test:e2e -- complaints.e2e-spec.ts
 */
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import { pastikanHostLokal, sasaranDbUji, type SasaranDbUji } from './lib/url-db-uji';

const AKAR_API = path.resolve(__dirname, '..');
const resolusi = createRequire(__filename);

async function utama(): Promise<void> {
  // Tanpa `override`, sesuai bawaan dotenv: nilai yang sudah ada di
  // `process.env` menang. Itu membuat `DATABASE_URL` masih dapat ditimpa dari
  // luar bila suatu saat diperlukan.
  dotenv.config({ path: path.join(AKAR_API, '.env') });

  const sasaran = sasaranDbUji(process.env.DATABASE_URL ?? '');
  pastikanHostLokal(sasaran.url);

  console.log(`Basis data uji: ${sasaran.nama} (bukan basis data pengembangan).`);

  if (sasaran.sudahTerpisah) {
    // CI sudah menyediakan basis datanya sendiri; tak ada yang perlu dibuat,
    // dan tak perlu menyentuh basis data pemeliharaan `postgres` sama sekali.
    console.log('DATABASE_URL sudah menunjuk basis data uji; dipakai apa adanya.');
  } else {
    await pastikanBasisDataAda(sasaran);
  }

  const kodeMigrasi = jalankan('prisma', ['migrate', 'deploy'], sasaran.url);
  if (kodeMigrasi !== 0) {
    console.error('Migrasi ke basis data uji gagal; jest tidak dijalankan.');
    process.exit(kodeMigrasi);
  }

  // `tsx prisma/seed.ts` LANGSUNG, bukan `prisma db seed`. Yang terakhir
  // menjalankan perintah seed lewat shell, sehingga `tsx` harus ada di PATH --
  // benar ketika dipanggil melalui pnpm, dan gagal dengan "'tsx' is not
  // recognized as an internal or external command" ketika skrip ini dijalankan
  // dengan cara lain. Terukur, bukan diduga.
  const kodeSeed = jalankan('tsx', ['prisma/seed.ts'], sasaran.url);
  if (kodeSeed !== 0) {
    console.error('Seed ke basis data uji gagal; jest tidak dijalankan.');
    process.exit(kodeSeed);
  }

  const kodeJest = jalankan(
    'jest',
    ['--config', 'test/jest-e2e.json', ...process.argv.slice(2)],
    sasaran.url,
  );
  process.exit(kodeJest);
}

/**
 * Membuat basis data uji bila belum ada. `CREATE DATABASE` tak dapat dijalankan
 * dari dalam basis data yang hendak dibuat, jadi sambungannya ke basis data
 * pemeliharaan `postgres`.
 */
async function pastikanBasisDataAda(sasaran: SasaranDbUji): Promise<void> {
  const prisma = new PrismaClient({ datasources: { db: { url: sasaran.urlPemeliharaan } } });
  try {
    const ada = await prisma.$queryRaw<unknown[]>`
      SELECT 1 FROM pg_database WHERE datname = ${sasaran.nama}
    `;
    if (ada.length > 0) {
      return;
    }

    // Nama basis datanya konstanta di `lib/url-db-uji.ts`, bukan masukan
    // pengguna, jadi interpolasi di sini tidak membuka jalan injeksi.
    // `CREATE DATABASE` memang tak menerima parameter terikat.
    await prisma.$executeRawUnsafe(`CREATE DATABASE "${sasaran.nama}"`);
    console.log(`Basis data uji '${sasaran.nama}' dibuat.`);
  } catch (err) {
    // 42P04 = duplicate_database. Dua pelari yang mulai bersamaan: yang kedua
    // kalah lomba, dan itu bukan kegagalan -- basis datanya memang sudah ada.
    if (String(err).includes('42P04')) {
      return;
    }
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Menjalankan CLI sebuah paket dengan `DATABASE_URL` menunjuk basis data uji.
 *
 * Dipanggil lewat `process.execPath` dan berkas masuk JS-nya, BUKAN lewat shim
 * `.cmd` di `node_modules/.bin`. Shim itu menuntut `shell: true` di Windows,
 * dan shell lalu mengurai ulang argumennya -- jalur repo ini memuat spasi, jadi
 * itu rusak.
 */
function jalankan(paket: string, argumen: string[], urlUji: string): number {
  const hasil = spawnSync(process.execPath, [berkasMasukCli(paket), ...argumen], {
    cwd: AKAR_API,
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: urlUji },
  });
  if (hasil.error) {
    throw hasil.error;
  }
  return hasil.status ?? 1;
}

function berkasMasukCli(paket: string): string {
  const berkasPaket = resolusi.resolve(`${paket}/package.json`);
  const isi = resolusi(berkasPaket) as { bin: string | Record<string, string> };
  const entri = typeof isi.bin === 'string' ? isi.bin : isi.bin[paket];
  return path.join(path.dirname(berkasPaket), entri);
}

void utama().catch((err: unknown) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
});
