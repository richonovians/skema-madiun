#!/usr/bin/env node
/**
 * Menjalankan `next build` atau `next start` dengan direktori keluaran
 * TERPISAH (23 September 2026).
 *
 * MENGAPA ADA. Suite Playwright selama ini diuji terhadap `next dev`, yang
 * mengompilasi tiap rute saat pertama diminta. Itu melahirkan perlombaan
 * antara uji dan kompilator: tiga lari penuh berturut-turut menghasilkan
 * 1/0/3 kegagalan, seluruhnya berbunyi "halaman belum siap" -- lembar gaya
 * belum berlaku, klik kehabisan waktu, panel tak pernah terbuka. Build
 * produksi tak punya kompilasi saat diminta, jadi kelas cacat itu lenyap
 * alih-alih diperkecil.
 *
 * MENGAPA BUKAN SEKADAR BARIS DI package.json. pnpm di Windows menjalankan
 * skrip lewat `cmd.exe`, dan bentuk `VAR=nilai perintah` gagal di sana dengan
 * `'VAR' is not recognized as an internal or external command`. Itu DIUJI di
 * mesin ini, bukan dikira. `cross-env` akan menyelesaikannya juga, tetapi
 * menambah dependensi demi satu variabel lingkungan tak sebanding -- berkas
 * ini tak punya dependensi sama sekali.
 *
 * MENGAPA distDir TERPISAH. `next build` menimpa `.next` milik `next dev`
 * yang sedang berjalan, dan akibatnya SELURUH rute menjadi 404. Dengan
 * `.next-e2e`, milik server pengembangan tak pernah tersentuh.
 *
 * Pemakaian:
 *   node scripts/server-e2e.mjs build
 *   node scripts/server-e2e.mjs start [-- argumen next]
 *
 * Peladen API pada porta 3001 SENGAJA tidak disentuh: Nest mengompilasi sekali
 * saat boot lalu melayani, jadi ia bukan sumber perlombaan yang sedang
 * ditutup di sini.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';

const DIST = '.next-e2e';
const DIIZINKAN = new Set(['build', 'start']);

const perintah = process.argv[2];
if (!DIIZINKAN.has(perintah)) {
  console.error(
    `server-e2e: perintah harus 'build' atau 'start', bukan ${JSON.stringify(perintah)}`,
  );
  process.exit(2);
}

// Sisa argumen diteruskan apa adanya, jadi `start -p 3000` tetap mungkin.
const sisa = process.argv.slice(3);

const require = createRequire(import.meta.url);
const binNext = require.resolve('next/dist/bin/next');

// Dijalankan lewat `process.execPath` alih-alih shell: di Windows berkas
// `node_modules/.bin/next` adalah `.CMD`, dan menyalakannya tanpa shell akan
// gagal sementara menyalakannya DENGAN shell membuka soal penggantian tanda
// kutip. Memanggil berkas JS-nya langsung menghindari keduanya.
const anak = spawn(process.execPath, [binNext, perintah, ...sisa], {
  stdio: 'inherit',
  env: { ...process.env, NEXT_DIST_DIR: DIST },
});

anak.on('exit', (kode, sinyal) => {
  if (sinyal) {
    process.kill(process.pid, sinyal);
    return;
  }
  process.exit(kode ?? 1);
});
