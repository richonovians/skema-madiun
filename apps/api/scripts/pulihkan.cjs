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
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
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

/** Menjalankan satu perintah psql pada basis data `db`, mengembalikan stdout. */
function psql(db, sql, kredensial, mode) {
  const arg = ['-U', kredensial.user, '-d', db, '-tAc', sql];
  const hasil =
    mode === 'local'
      ? spawnSync('psql', ['-h', kredensial.host, '-p', kredensial.port, ...arg], {
          env: { ...process.env, PGPASSWORD: kredensial.sandi },
          encoding: 'utf8',
        })
      : spawnSync('docker', ['exec', '-i', CONTAINER, 'psql', ...arg], { encoding: 'utf8' });
  if (hasil.status !== 0) {
    throw new Error(`psql gagal pada "${db}": ${String(hasil.stderr).trim()}`);
  }
  return String(hasil.stdout).trim();
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
  const isi = fs.readFileSync(sementara, 'utf8');
  const jalankan =
    mode === 'local'
      ? spawnSync(
          'psql',
          [
            '-h',
            kredensial.host,
            '-p',
            kredensial.port,
            '-U',
            kredensial.user,
            '-d',
            dbTujuan,
            '-v',
            'ON_ERROR_STOP=1',
          ],
          {
            env: { ...process.env, PGPASSWORD: kredensial.sandi },
            input: isi,
            encoding: 'utf8',
          },
        )
      : spawnSync(
          'docker',
          [
            'exec',
            '-i',
            CONTAINER,
            'psql',
            '-U',
            kredensial.user,
            '-d',
            dbTujuan,
            '-v',
            'ON_ERROR_STOP=1',
          ],
          { input: isi, encoding: 'utf8' },
        );

  fs.rmSync(path.dirname(sementara), { recursive: true, force: true });

  if (jalankan.status !== 0) {
    throw new Error(`psql gagal memulihkan: ${String(jalankan.stderr).trim()}`);
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

utama().catch((err) => {
  console.error('');
  console.error(`GAGAL: ${err.message}`);
  process.exit(1);
});
