#!/usr/bin/env node
'use strict';
/**
 * Mengenkripsi lampiran yang tersimpan SEBELUM enkripsi at-rest dinyalakan
 * (23 September 2026).
 *
 * MENGAPA PERLU ADA. Sejak hari ini lampiran baru ditulis terenkripsi, tetapi
 * yang sudah ada tetap polos di disk. Penyaji di app.setup.ts sengaja tetap
 * melayaninya -- pengaduan lama tak boleh mendadak kehilangan buktinya -- dan
 * justru itu yang membuat migrasi mudah dilupakan: semuanya tampak bekerja.
 * Setiap berkas polos yang tertinggal adalah foto warga yang terbaca siapa pun
 * yang memperoleh disknya.
 *
 * IDEMPOTEN. Berkas yang sudah bermagic dilewati, jadi menjalankannya dua kali
 * aman dan lari kedua adalah cara memastikan lari pertama tuntas.
 *
 * ATOMIK PER BERKAS. Ciphertext ditulis ke berkas sementara lalu di-`rename`.
 * Menulis di tempat berarti berkas yang tinggal separuh bila proses mati di
 * tengah, dan separuh ciphertext tak dapat dipulihkan oleh apa pun.
 *
 * Pemakaian:
 *   pnpm enkripsi:lampiran            (jalankan sungguhan)
 *   pnpm enkripsi:lampiran -- --uji   (hanya melaporkan, tak menulis apa pun)
 */
const fs = require('node:fs');
const path = require('node:path');
const { enkripsi, terenkripsi, kunciDariEnv, INFO_LAMPIRAN } = require('./lib/envelope.cjs');

const HANYA_LAPORAN = process.argv.includes('--uji');

function telusuri(dir) {
  const hasil = [];
  for (const entri of fs.readdirSync(dir, { withFileTypes: true })) {
    const penuh = path.join(dir, entri.name);
    if (entri.isDirectory()) {
      hasil.push(...telusuri(penuh));
    } else if (entri.isFile()) {
      hasil.push(penuh);
    }
  }
  return hasil;
}

function utama() {
  const dir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
  if (!fs.existsSync(dir)) {
    console.log(`Direktori unggahan tak ada: ${dir}. Tak ada yang perlu dikerjakan.`);
    return 0;
  }

  // Kunci dibaca SEBELUM berkas apa pun disentuh: gagal karena kunci tak ada
  // harus terjadi saat belum ada satu berkas pun berubah.
  const kunci = kunciDariEnv('DATA_ENCRYPTION_KEY');

  const berkas = telusuri(dir);
  let diubah = 0;
  let dilewati = 0;
  const gagal = [];

  for (const jalur of berkas) {
    const isi = fs.readFileSync(jalur);
    if (terenkripsi(isi)) {
      dilewati += 1;
      continue;
    }
    if (HANYA_LAPORAN) {
      console.log(`AKAN DIENKRIPSI: ${path.relative(dir, jalur)} (${isi.length} bita)`);
      diubah += 1;
      continue;
    }
    const sementara = `${jalur}.enkripsi-sementara`;
    try {
      fs.writeFileSync(sementara, enkripsi(isi, kunci, INFO_LAMPIRAN));
      fs.renameSync(sementara, jalur);
      diubah += 1;
      console.log(`OK: ${path.relative(dir, jalur)}`);
    } catch (err) {
      // Berkas sementara dibersihkan supaya lari berikutnya tak menemui sampah
      // yang ikut terhitung sebagai lampiran.
      try {
        fs.unlinkSync(sementara);
      } catch {
        /* berkas sementara memang tak sempat dibuat */
      }
      gagal.push({ jalur, pesan: String(err) });
    }
  }

  console.log('');
  console.log(`Direktori   : ${dir}`);
  console.log(`Berkas      : ${berkas.length}`);
  console.log(`${HANYA_LAPORAN ? 'Akan diubah ' : 'Dienkripsi  '}: ${diubah}`);
  console.log(`Sudah aman  : ${dilewati}`);
  if (gagal.length > 0) {
    console.error(`GAGAL       : ${gagal.length}`);
    for (const g of gagal) {
      console.error(`  ${g.jalur}: ${g.pesan}`);
    }
    return 1;
  }
  return 0;
}

process.exit(utama());
