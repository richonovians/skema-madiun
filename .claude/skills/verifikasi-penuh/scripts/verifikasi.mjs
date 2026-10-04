#!/usr/bin/env node
/**
 * Verifikasi penuh repo SKEMA. Dijalankan dari mana pun; akar repo dicari
 * sendiri dari lokasi berkas ini.
 *
 * Alasan skrip ini ada, dan bukan sekadar daftar perintah di dokumen: tiga
 * detailnya selalu salah bila ditulis ulang dari ingatan.
 *
 *   1. Jest `apps/web` TIDAK keluar sendiri. Tanpa `--forceExit` prosesnya
 *      menggantung sesudah uji selesai, dan gantungannya mudah disalahartikan
 *      sebagai uji yang lambat.
 *   2. `prettier --check` atas `apps/web` HAMPA, sebab .prettierignore
 *      mengecualikannya. Langkah prettier di sini karena itu diberi label yang
 *      menyebut batasnya, supaya hasilnya tak pernah dikutip sebagai bukti
 *      untuk perubahan frontend.
 *   3. Keluaran uji TIDAK boleh disalurkan ke pipa. Penyangga pipa menahan
 *      seluruh keluaran sampai proses berakhir. Karena itu tiap langkah
 *      diwarisi stdio induk, dan ringkasannya disusun dari kode keluar.
 *
 * Kedua suite e2e TIDAK dijalankan secara baku: keduanya menulis baris
 * sungguhan ke basis data dan menuntut Docker hidup. Nyalakan dengan bendera.
 */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as path from 'node:path';
import { existsSync } from 'node:fs';

const bendera = new Set(process.argv.slice(2));
const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');

if (!existsSync(path.join(AKAR, 'pnpm-workspace.yaml'))) {
  console.error(`Akar repo tidak ditemukan di ${AKAR} (pnpm-workspace.yaml tidak ada).`);
  process.exit(2);
}

/** `pnpm` di Windows adalah pnpm.cmd, dan itu menuntut shell. */
const PAKAI_SHELL = process.platform === 'win32';

const langkah = [
  {
    nama: 'UJI API (unit)',
    cmd: 'pnpm',
    args: ['--filter', '@skm-spm/api', 'test'],
  },
  {
    nama: 'UJI WEB (komponen)',
    cmd: 'pnpm',
    // --forceExit WAJIB, lihat catatan 1 di atas.
    args: ['--filter', '@skm-spm/web', 'test', '--', '--forceExit'],
  },
  {
    nama: 'ESLINT (seluruh repo)',
    cmd: 'pnpm',
    args: ['lint'],
  },
  {
    nama: 'PRETTIER (apps/web DIKECUALIKAN .prettierignore)',
    cmd: 'pnpm',
    args: ['format:check'],
  },
];

if (bendera.has('--e2e-api')) {
  langkah.splice(1, 0, {
    nama: 'UJI API (e2e, menuntut Postgres hidup)',
    cmd: 'pnpm',
    args: ['--filter', '@skm-spm/api', 'test:e2e'],
  });
}

if (bendera.has('--e2e-web')) {
  langkah.push({
    nama: 'UJI WEB (Playwright, satu pekerja)',
    cmd: 'pnpm',
    args: ['--filter', '@skm-spm/web', 'test:e2e'],
  });
}

if (!bendera.has('--lewati-bersih')) {
  langkah.push({
    nama: 'BERSIHKAN DATA UJI',
    cmd: process.execPath,
    args: [path.join(AKAR, 'apps', 'web', 'e2e', 'support', 'bersihkan-data-uji.mjs')],
    pakaiShell: false,
  });
}

const hasil = [];
for (const l of langkah) {
  console.log(`\n${'='.repeat(70)}\n=== ${l.nama}\n${'='.repeat(70)}`);
  const mulai = Date.now();
  const r = spawnSync(l.cmd, l.args, {
    cwd: AKAR,
    stdio: 'inherit', // jangan pipa, lihat catatan 3 di atas
    shell: l.pakaiShell ?? PAKAI_SHELL,
  });
  const detik = ((Date.now() - mulai) / 1000).toFixed(1);
  // `r.status` null bila proses mati karena sinyal; itu kegagalan, bukan lulus.
  const kode = r.error ? -1 : (r.status ?? -1);
  hasil.push({ nama: l.nama, kode, detik, galat: r.error?.message });
}

console.log(`\n${'='.repeat(70)}\n=== RINGKASAN\n${'='.repeat(70)}`);
for (const h of hasil) {
  const tanda = h.kode === 0 ? 'LULUS ' : 'GAGAL ';
  console.log(`${tanda} kode=${String(h.kode).padStart(3)}  ${h.detik.padStart(6)}s  ${h.nama}`);
  if (h.galat) console.log(`        galat: ${h.galat}`);
}

const gagal = hasil.filter((h) => h.kode !== 0);
const dilewati = [];
if (!bendera.has('--e2e-api')) dilewati.push('apps/api e2e (--e2e-api)');
if (!bendera.has('--e2e-web')) dilewati.push('Playwright (--e2e-web)');
if (bendera.has('--lewati-bersih')) dilewati.push('pembersihan data uji');

if (dilewati.length) {
  console.log(`\nTIDAK DIJALANKAN: ${dilewati.join(', ')}`);
  console.log('Jangan laporkan langkah yang dilewati sebagai langkah yang lulus.');
}

console.log(
  gagal.length ? `\nADA ${gagal.length} LANGKAH GAGAL.` : '\nSEMUA LANGKAH YANG DIJALANKAN LULUS.',
);
process.exit(gagal.length ? 1 : 0);
