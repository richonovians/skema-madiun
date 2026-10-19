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
import * as path from 'node:path';
import * as dotenv from 'dotenv';
import { jalankanCli } from './lib/jalankan-cli';
import { DB_REDIS_UJI, redisDbLogisBilaAda } from './lib/url-redis';
import { pastikanHostLokal, sasaranDbUji } from './lib/url-db-uji';

const AKAR_API = path.resolve(__dirname, '..');

async function utama(): Promise<void> {
  // Tanpa `override`, sesuai bawaan dotenv: nilai yang sudah ada di
  // `process.env` menang. Itu membuat `DATABASE_URL` masih dapat ditimpa dari
  // luar bila suatu saat diperlukan.
  dotenv.config({ path: path.join(AKAR_API, '.env') });

  const sasaran = sasaranDbUji(process.env.DATABASE_URL ?? '');
  pastikanHostLokal(sasaran.url);

  // DUA KALIMAT BERBEDA, dan bedanya penting. Versi sebelumnya selalu mencetak
  // "(bukan basis data pengembangan)" -- benar pada jalur penurunan, tetapi
  // KLAIM YANG TAK DAPAT DIBUKTIKAN pada jalur `sudahTerpisah`: bila
  // `DATABASE_URL` seseorang memang bernama `skm_uji` dan `pnpm dev` juga
  // memakainya, maka itu justru basis data pengembangannya. Skrip ini tak punya
  // cara mengetahuinya, jadi ia berhenti mengaku tahu.
  if (sasaran.sudahTerpisah) {
    console.log(
      `Basis data uji: ${sasaran.nama}, dari DATABASE_URL apa adanya. ` +
        'Pastikan ini BUKAN basis data yang dipakai `pnpm dev`.',
    );
  } else {
    console.log(
      `Basis data uji: ${sasaran.nama}, diturunkan dari DATABASE_URL. ` +
        'Basis data pengembangan tidak disentuh.',
    );
  }

  // TIDAK ADA LANGKAH `CREATE DATABASE` DI SINI, dan itu hasil pengukuran, bukan
  // kelalaian. `prisma migrate deploy` membuat sendiri basis data yang belum
  // ada: diukur 13 Oktober 2026 terhadap nama yang belum pernah dipakai, ia
  // mencetak "PostgreSQL database ... created", menerapkan seluruh migrasi, dan
  // keluar 0.
  //
  // Versi sebelumnya menyambung ke basis data pemeliharaan `postgres` lalu
  // menjalankan `CREATE DATABASE` sendiri. Itu 35 baris yang tak melakukan apa
  // pun yang belum dilakukan langkah berikutnya, dan harganya nyata: ia menuntut
  // hak akses ke basis data `postgres` yang tak selalu dimiliki pemakainya.

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

  // REDIS TERSENDIRI, basis data logis 2. Hanya untuk jest: migrasi dan seed
  // tak menyentuh Redis sama sekali.
  //
  // TERUKUR 13 Oktober 2026, dan gejalanya menyesatkan. `role-journeys` menutup
  // survei lalu menuntut survei itu muncul di `GET /dashboard/ikm`, dan ia
  // memerah -- bukan karena pembatalan singgahannya salah, melainkan karena
  // TIGA berkas spec memanggil endpoint itu dan berbagi satu kunci
  // `singgahan:ikm-dashboard:...` ber-TTL 60 detik. Kunci singgahan tak membawa
  // penanda basis data, jadi e2e terhadap `skm_uji` juga berbagi kunci dengan
  // aplikasi dev terhadap `skm_db`: hasil e2e bergantung pada apa pun yang
  // menyentuh Redis dalam enam puluh detik terakhir.
  const redisUji = redisDbLogisBilaAda(process.env.REDIS_URL, DB_REDIS_UJI);
  const kodeJest = jalankanCli(
    'jest',
    ['--config', 'test/jest-e2e.json', ...process.argv.slice(2)],
    {
      cwd: AKAR_API,
      databaseUrl: sasaran.url,
      // `BilaAda`: CI tak punya Redis dan tak menyetel `REDIS_URL` sama sekali.
      env: redisUji === undefined ? {} : { REDIS_URL: redisUji },
    },
  );
  process.exit(kodeJest);
}

function jalankan(paket: string, argumen: string[], urlUji: string): number {
  return jalankanCli(paket, argumen, { cwd: AKAR_API, databaseUrl: urlUji });
}

void utama().catch((err: unknown) => {
  console.error(String(err instanceof Error ? err.message : err));
  process.exit(1);
});
