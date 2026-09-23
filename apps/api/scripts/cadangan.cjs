#!/usr/bin/env node
'use strict';
/**
 * Membuat cadangan TERENKRIPSI dari basis data dan lampiran (23 September 2026).
 *
 * SEBELUM INI TIDAK ADA MEKANISME CADANGAN SAMA SEKALI. Bukan "cadangannya tak
 * terenkripsi", melainkan tak pernah ada. Itu perlu disebut karena berkas ini
 * menutup dua celah sekaligus, dan yang kedua jauh lebih besar daripada yang
 * pertama.
 *
 * KUNCI YANG BERBEDA DARI KUNCI DATA, dan itu bukan kerapian. Kunci cadangan
 * boleh diserahkan kepada pemegang salinan luar; kunci data tak boleh
 * meninggalkan server aplikasi. Akibatnya yang WAJIB dipahami: cadangan ini
 * TIDAK CUKUP untuk memulihkan sistem. Isinya memuat kolom dan lampiran yang
 * terenkripsi DATA_ENCRYPTION_KEY, jadi pemulihan di server baru menuntut KEDUA
 * kunci. Cadangan tanpa kunci data adalah hiasan. Manifes mencatat sidik jari
 * keduanya supaya kelak dapat diketahui kunci mana yang dibutuhkan.
 *
 * LAMPIRAN DISALIN, TIDAK DIENKRIPSI ULANG: sejak enkripsi at-rest menyala ia
 * sudah terenkripsi di disk. Berkas yang belum bermagic DIPERINGATKAN dengan
 * menyebut namanya, sebab berkas itu akan mendarat POLOS di dalam cadangan --
 * dan cadangan biasanya berakhir di tempat yang lebih banyak tangannya daripada
 * server aslinya.
 *
 * Pemakaian:
 *   pnpm cadangan
 *   pnpm cadangan -- --keluar D:/cadangan-skm
 */
const { spawnSync, spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { enkripsiAliran } = require('./lib/aliran-kripto.cjs');
const { terenkripsi, kunciDariEnv, INFO_CADANGAN } = require('./lib/envelope.cjs');

const CONTAINER = process.env.BACKUP_PG_CONTAINER || 'skm-db';

function argumen(nama, baku) {
  const i = process.argv.indexOf(`--${nama}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : baku;
}

/** `postgresql://user:pass@host:port/db?schema=public` -> bagian-bagiannya. */
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

/**
 * Memilih `pg_dump` dari PATH atau dari container.
 *
 * Versi `pg_dump` HARUS sepadan dengan server (PostgreSQL 18 di proyek ini);
 * yang di dalam container dijamin sepadan, yang di PATH belum tentu. Karena itu
 * container dipakai bila `pg_dump` lokal tak ada, dan pilihannya SELALU
 * dicetak: operator berhak tahu perkakas mana yang membuat cadangannya.
 */
function pilihSumber() {
  const paksa = process.env.BACKUP_PG_DUMP_MODE;
  if (paksa === 'local' || paksa === 'docker') {
    return paksa;
  }
  const coba = spawnSync('pg_dump', ['--version'], { encoding: 'utf8' });
  return coba.status === 0 ? 'local' : 'docker';
}

function sidikJari(hex) {
  return createHash('sha256').update(Buffer.from(hex, 'hex')).digest('hex').slice(0, 16);
}

function periksaLampiran(dir) {
  const polos = [];
  if (!fs.existsSync(dir)) {
    return { jumlah: 0, polos };
  }
  let jumlah = 0;
  const telusuri = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        telusuri(p);
      } else if (e.isFile()) {
        jumlah += 1;
        if (!terenkripsi(fs.readFileSync(p))) {
          polos.push(path.relative(dir, p));
        }
      }
    }
  };
  telusuri(dir);
  return { jumlah, polos };
}

async function utama() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    throw new Error('DATABASE_URL belum disetel.');
  }
  const db = uraiDatabaseUrl(dbUrl);

  // Kedua kunci dibaca LEBIH DULU. Gagal karena kunci tak ada harus terjadi
  // sebelum `pg_dump` berjalan, bukan sesudah basis data selesai dibaca.
  const kunciCad = kunciDariEnv('BACKUP_ENCRYPTION_KEY');
  // Kunci data TIDAK dipakai mengenkripsi apa pun di sini; ia diperiksa supaya
  // manifes dapat mencatat sidik jarinya, dan supaya cadangan tak pernah dibuat
  // oleh proses yang bahkan tak tahu kunci data mana yang sedang berlaku.
  kunciDariEnv('DATA_ENCRYPTION_KEY');

  const stempel = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15);
  const akar = path.resolve(process.cwd(), argumen('keluar', 'cadangan'));
  const tujuan = path.join(akar, `skm-${stempel}`);
  fs.mkdirSync(tujuan, { recursive: true });

  const sumber = pilihSumber();
  console.log(
    `Sumber pg_dump : ${sumber === 'local' ? 'pg_dump di PATH' : `docker exec ${CONTAINER}`}`,
  );
  console.log(`Basis data     : ${db.db} @ ${db.host}:${db.port}`);
  console.log(`Tujuan         : ${tujuan}`);
  console.log('');

  const berkasDump = path.join(tujuan, 'dump.sql.enc');
  const argDump = ['--no-owner', '--no-acl', '-U', db.user, '-d', db.db];
  const anak =
    sumber === 'local'
      ? spawn('pg_dump', ['-h', db.host, '-p', db.port, ...argDump], {
          env: { ...process.env, PGPASSWORD: db.sandi },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
      : spawn('docker', ['exec', '-i', CONTAINER, 'pg_dump', ...argDump], {
          stdio: ['ignore', 'pipe', 'pipe'],
        });

  let galat = '';
  anak.stderr.on('data', (d) => {
    galat += String(d);
  });

  const selesai = new Promise((resolve, reject) => {
    anak.on('error', reject);
    anak.on('close', (kode) => (kode === 0 ? resolve() : reject(new Error(galat.trim()))));
  });

  const bita = await enkripsiAliran(anak.stdout, berkasDump, kunciCad, INFO_CADANGAN);
  await selesai;

  if (bita === 0) {
    throw new Error('pg_dump tak menghasilkan satu bita pun. Cadangan dibatalkan.');
  }

  // Lampiran disalin apa adanya; sudah terenkripsi sejak 23 September 2026.
  const dirUnggahan = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  const { jumlah, polos } = periksaLampiran(dirUnggahan);
  if (fs.existsSync(dirUnggahan)) {
    fs.cpSync(dirUnggahan, path.join(tujuan, 'uploads'), { recursive: true });
  }

  const manifes = {
    dibuat: new Date().toISOString(),
    basisData: { nama: db.db, host: db.host, port: db.port },
    sumberDump: sumber,
    dumpBitaPlaintext: bita,
    dumpBitaTerenkripsi: fs.statSync(berkasDump).size,
    lampiranJumlah: jumlah,
    lampiranMasihPolos: polos,
    // SIDIK JARI, bukan kuncinya. Gunanya menjawab "cadangan ini butuh kunci
    // yang mana" tanpa menyimpan satu pun kunci di dalam cadangan itu sendiri.
    sidikJariKunciCadangan: sidikJari(process.env.BACKUP_ENCRYPTION_KEY),
    sidikJariKunciData: sidikJari(process.env.DATA_ENCRYPTION_KEY),
    catatan:
      'Pemulihan menuntut BACKUP_ENCRYPTION_KEY (membuka dump ini) DAN ' +
      'DATA_ENCRYPTION_KEY (membuka kolom terenkripsi serta lampiran di dalamnya). ' +
      'Tanpa yang kedua, cadangan ini pulih menjadi sistem yang isinya tak terbaca.',
  };
  fs.writeFileSync(path.join(tujuan, 'manifes.json'), `${JSON.stringify(manifes, null, 2)}\n`);

  console.log(`Dump           : ${bita} bita plaintext -> ${manifes.dumpBitaTerenkripsi} bita`);
  console.log(`Lampiran       : ${jumlah} berkas`);
  if (polos.length > 0) {
    console.warn('');
    console.warn(
      `PERINGATAN: ${polos.length} lampiran MASIH POLOS dan mendarat polos di cadangan:`,
    );
    for (const n of polos) {
      console.warn(`  ${n}`);
    }
    console.warn('Jalankan `pnpm enkripsi:lampiran` lalu cadangkan ulang.');
  }
  console.log('');
  console.log('Selesai. Simpan cadangan ini DI LUAR mesin ini, beserta kedua kunci.');
  // Sidik jari kunci data dicetak agar operator dapat mencocokkannya kelak.
  console.log(`Sidik jari kunci data: ${sidikJari(process.env.DATA_ENCRYPTION_KEY)}`);
}

utama().catch((err) => {
  console.error(`GAGAL: ${err.message}`);
  process.exit(1);
});
