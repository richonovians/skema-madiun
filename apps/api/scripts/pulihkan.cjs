#!/usr/bin/env node
'use strict';
/**
 * Memulihkan cadangan terenkripsi (23 September 2026).
 *
 * CADANGAN YANG BELUM PERNAH DIPULIHKAN BUKAN CADANGAN. Berkas ini ada supaya
 * kalimat itu dapat dibuktikan, bukan diyakini.
 *
 * TIGA PENJAGA, dan ketiganya ada karena skrip pemulihan justru perkakas yang
 * PALING MUDAH dipakai merusak data sungguhan -- ia memang dijalankan pada hari
 * yang buruk, oleh orang yang sedang panik:
 *
 *   1. `--db` WAJIB DISEBUT. Tak ada tujuan baku. Basis data tujuan adalah
 *      keputusan yang harus diketik, bukan diwarisi dari lingkungan.
 *   2. MENOLAK bila nama tujuannya sama dengan yang ada di DATABASE_URL.
 *      Itu basis data yang sedang dipakai aplikasi; menimpanya menuntut
 *      `--paksa` yang tersurat.
 *   3. MENOLAK bila basis data tujuan sudah berisi tabel, juga tanpa `--paksa`.
 *
 * TUJUAN YANG BELUM ADA DIBUAT KOSONG (BUG-074, 17 November 2026). Basis data
 * baru tak berisi apa pun untuk ditimpa, jadi ketiga penjaga tetap utuh.
 *
 * DUMP DIVERIFIKASI SAMPAI TUNTAS SEBELUM SATU PERNYATAAN SQL PUN DIJALANKAN.
 * `dekripsiAliran` tak pernah membuat berkas tujuan kecuali tag GCM-nya cocok,
 * jadi `psql` tak pernah melihat berkas yang belum terbukti utuh.
 *
 * LAMPIRAN TIDAK DIPULIHKAN OTOMATIS. Menyalin balik direktori unggahan dapat
 * menimpa lampiran yang lebih baru daripada cadangannya, dan itu kehilangan
 * data yang tak bergejala. Jalurnya dicetak agar operator menyalinnya sendiri.
 *
 * Pemakaian:
 *   pnpm pulihkan -- --dari cadangan/skm-20260923-093000 --db skm_db_uji_pulih
 *   pnpm pulihkan -- --dari <dir> --db <nama> --paksa
 */
const { spawn, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { pipeline } = require('node:stream/promises');
const path = require('node:path');
const os = require('node:os');
const { dekripsiAliran } = require('./lib/aliran-kripto.cjs');
const { kunciDariEnv, INFO_CADANGAN } = require('./lib/envelope.cjs');

const CONTAINER = process.env.BACKUP_PG_CONTAINER || 'skm-db';
const PAKSA = process.argv.includes('--paksa');

function argumen(nama) {
  const i = process.argv.indexOf(`--${nama}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null;
}

function uraiDatabaseUrl(url) {
  const u = new URL(url);
  return {
    user: decodeURIComponent(u.username),
    sandi: decodeURIComponent(u.password),
    host: u.hostname,
    port: u.port || '5432',
    db: decodeURIComponent(u.pathname.replace(/^\//, '')),
  };
}

function modeSumber() {
  const paksa = process.env.BACKUP_PG_DUMP_MODE;
  if (paksa === 'local' || paksa === 'docker') {
    return paksa;
  }
  return spawnSync('psql', ['--version'], { encoding: 'utf8' }).status === 0 ? 'local' : 'docker';
}

/**
 * Perintah untuk menjalankan `psql` pada basis data `db`: `[perintah, argumen, env]`.
 * Satu tempat untuk kedua mode, supaya pemeriksaan dan pemulihan tak pernah
 * menyambung ke server yang berbeda.
 */
function perintahPsql(db, kredensial, mode, argTambahan) {
  const arg = ['-U', kredensial.user, '-d', db, ...argTambahan];
  return mode === 'local'
    ? [
        'psql',
        ['-h', kredensial.host, '-p', kredensial.port, ...arg],
        { ...process.env, PGPASSWORD: kredensial.sandi },
      ]
    : ['docker', ['exec', '-i', CONTAINER, 'psql', ...arg], process.env];
}

/** Menjalankan satu perintah psql pada basis data `db`, mengembalikan stdout. */
function psql(db, sql, kredensial, mode) {
  const [perintah, arg, env] = perintahPsql(db, kredensial, mode, ['-tAc', sql]);
  const hasil = spawnSync(perintah, arg, { env, encoding: 'utf8' });
  if (hasil.status !== 0) {
    throw new Error(`psql gagal pada "${db}": ${String(hasil.stderr).trim()}`);
  }
  return String(hasil.stdout).trim();
}

/**
 * Memastikan basis data `db` ada, dan MEMBUATNYA KOSONG bila belum (BUG-074).
 * Mengembalikan `true` bila basis datanya baru dibuat.
 *
 * Pemeriksaan dan `CREATE DATABASE` dijalankan dari basis data DATABASE_URL,
 * bukan dari `db` itu sendiri: menyambung ke tujuan yang belum ada dijawab
 * `FATAL: database "..." does not exist`, dan sampai 17 November 2026 itulah
 * yang membuat skrip ini menolak pemulihan ke tempat baru -- bentuk pemulihan
 * yang paling wajar. Basis data `postgres` sengaja tak dipakai: hak akses ke
 * sana tak selalu dimiliki, sedangkan basis data aplikasi pasti ada.
 *
 * Membuat tujuan tak melemahkan penjaga mana pun. Basis data yang baru lahir
 * tak berisi apa pun untuk ditimpa, dan namanya tetap diketik operator lewat
 * `--db`.
 */
function pastikanTujuanAda(db, kredensial, mode) {
  const literal = `'${db.replace(/'/g, "''")}'`;
  const ada = psql(
    kredensial.db,
    `SELECT 1 FROM pg_database WHERE datname = ${literal}`,
    kredensial,
    mode,
  );
  if (ada === '1') {
    return false;
  }
  try {
    psql(kredensial.db, `CREATE DATABASE "${db.replace(/"/g, '""')}"`, kredensial, mode);
  } catch (err) {
    throw new Error(
      `"${db}" belum ada dan tak dapat dibuat oleh pengguna "${kredensial.user}".\n` +
        `Buat dulu dengan CREATE DATABASE, lalu ulangi.\n${err.message}`,
    );
  }
  return true;
}

/**
 * Mengalirkan berkas `berkas` ke stdin proses `perintah` (BUG-074).
 *
 * TIDAK PERNAH DIMUAT UTUH KE MEMORI. Sampai 17 November 2026 dump dibaca
 * menjadi satu string lalu diserahkan ke `spawnSync({ input })`; batas string
 * Node 64-bit `536.870.888` karakter, jadi dump di atas ~512 MiB ditolak
 * `ERR_STRING_TOO_LONG` sesudah dekripsi -- persis pada hari pemulihan.
 *
 * stdout DIBUANG: `psql` mencetak satu tanda perintah per pernyataan, dan tak
 * satu pun dipakai. stderr dikumpulkan untuk pesan galat.
 *
 * `allSettled`, bukan `all`, dan galat PROSES didahulukan. Bila `psql` berhenti
 * di tengah (ON_ERROR_STOP), penulisan ke stdin-nya gagal EPIPE; pesan yang
 * berguna bagi operator adalah stderr `psql`, bukan EPIPE itu.
 */
async function alirkanKeProses(berkas, perintah, arg, env) {
  const anak = spawn(perintah, arg, { env, stdio: ['pipe', 'ignore', 'pipe'] });

  let galat = '';
  anak.stderr.on('data', (d) => {
    galat += String(d);
  });

  const selesai = new Promise((resolve, reject) => {
    anak.on('error', reject);
    anak.on('close', (kode) =>
      kode === 0 ? resolve() : reject(new Error(`psql gagal memulihkan: ${galat.trim()}`)),
    );
  });

  const [hasilAliran, hasilProses] = await Promise.allSettled([
    pipeline(fs.createReadStream(berkas), anak.stdin),
    selesai,
  ]);
  if (hasilProses.status === 'rejected') throw hasilProses.reason;
  if (hasilAliran.status === 'rejected') throw hasilAliran.reason;
}

async function utama() {
  const dari = argumen('dari');
  const dbTujuan = argumen('db');
  if (!dari || !dbTujuan) {
    throw new Error(
      'Wajib: --dari <direktori cadangan> --db <nama basis data tujuan>.\n' +
        'Tak ada tujuan baku dengan sengaja: basis data tujuan harus diketik.',
    );
  }

  const dirCadangan = path.resolve(process.cwd(), dari);
  const berkasDump = path.join(dirCadangan, 'dump.sql.enc');
  if (!fs.existsSync(berkasDump)) {
    throw new Error(`Tak ada dump.sql.enc di ${dirCadangan}`);
  }

  const kredensial = uraiDatabaseUrl(process.env.DATABASE_URL || '');
  const mode = modeSumber();

  // PENJAGA 2: basis data yang sedang dipakai aplikasi.
  if (dbTujuan === kredensial.db && !PAKSA) {
    throw new Error(
      `"${dbTujuan}" adalah basis data yang sedang dipakai aplikasi (DATABASE_URL).\n` +
        'Memulihkan ke sana akan MENIMPA data yang berlaku sekarang.\n' +
        'Bila memang itu yang Anda maksud, ulangi dengan --paksa.',
    );
  }

  // Tujuan yang belum ada dibuat kosong, supaya penjaga 3 dapat menyambung ke
  // sana. Basis data baru lolos penjaga 3 dengan sendirinya: 0 tabel.
  if (pastikanTujuanAda(dbTujuan, kredensial, mode)) {
    console.log(`Basis data "${dbTujuan}" belum ada; dibuat kosong.`);
  }

  // PENJAGA 3: tujuan yang tak kosong.
  const jumlahTabel = Number(
    psql(
      dbTujuan,
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'",
      kredensial,
      mode,
    ),
  );
  if (jumlahTabel > 0 && !PAKSA) {
    throw new Error(
      `"${dbTujuan}" sudah berisi ${jumlahTabel} tabel.\n` +
        'Pemulihan akan menimpanya. Ulangi dengan --paksa bila memang itu maksudnya.',
    );
  }

  const manifesJalur = path.join(dirCadangan, 'manifes.json');
  if (fs.existsSync(manifesJalur)) {
    const m = JSON.parse(fs.readFileSync(manifesJalur, 'utf8'));
    console.log(`Cadangan dibuat: ${m.dibuat}`);
    console.log(`Butuh kunci data bersidik jari: ${m.sidikJariKunciData}`);
    if (Array.isArray(m.lampiranMasihPolos) && m.lampiranMasihPolos.length > 0) {
      console.warn(`PERINGATAN: ${m.lampiranMasihPolos.length} lampiran polos di cadangan ini.`);
    }
  }

  const kunci = kunciDariEnv('BACKUP_ENCRYPTION_KEY');
  const sementara = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'skm-pulih-')), 'dump.sql');

  console.log('Mendekripsi dan memverifikasi dump...');
  await dekripsiAliran(berkasDump, sementara, kunci, INFO_CADANGAN);
  console.log(`Terverifikasi utuh: ${fs.statSync(sementara).size} bita.`);

  console.log(`Memulihkan ke "${dbTujuan}"...`);
  const [perintah, arg, env] = perintahPsql(dbTujuan, kredensial, mode, ['-v', 'ON_ERROR_STOP=1']);
  try {
    await alirkanKeProses(sementara, perintah, arg, env);
  } finally {
    fs.rmSync(path.dirname(sementara), { recursive: true, force: true });
  }

  console.log('');
  console.log(`Selesai. Basis data "${dbTujuan}" sudah terisi.`);
  const dirLampiran = path.join(dirCadangan, 'uploads');
  if (fs.existsSync(dirLampiran)) {
    console.log('');
    console.log('Lampiran TIDAK disalin otomatis, supaya lampiran yang lebih baru');
    console.log('daripada cadangan ini tak tertimpa diam-diam. Salin sendiri dari:');
    console.log(`  ${dirLampiran}`);
    console.log('Membukanya menuntut DATA_ENCRYPTION_KEY yang sama dengan saat dicadangkan.');
  }
}

if (require.main === module) {
  utama().catch((err) => {
    console.error('');
    console.error(`GAGAL: ${err.message}`);
    process.exit(1);
  });
}

module.exports = { alirkanKeProses };
