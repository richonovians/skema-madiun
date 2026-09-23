#!/usr/bin/env node
'use strict';
/**
 * Memutar `DATA_ENCRYPTION_KEY` ke kunci baru (23 September 2026).
 *
 * MENYENTUH SELURUH DATA TERENKRIPSI: setiap lampiran di disk, dan setiap baris
 * `complaints.uraian` serta `complaint_replies.pesan`. Ini skrip paling berisiko
 * di repositori ini, dan bentuknya dirancang sekitar risiko itu.
 *
 * AMAN DIULANG, dan itu bukan kenyamanan melainkan syarat. Bila prosesnya mati
 * di tengah, sebagian data memakai kunci baru dan sebagian masih kunci lama --
 * sementara aplikasi hanya mengenal satu kunci. Karena itu tiap benda diperiksa
 * dengan kunci BARU lebih dulu (lihat lib/rotasi.cjs): yang sudah dirotasi
 * dilewati, sisanya dituntaskan. Menjalankan ulang menyelesaikan yang
 * tertinggal; menjalankannya pada data yang sudah tuntas tak mengubah apa pun.
 *
 * KUNCI BARU TAK PERNAH DICETAK. Ia ditulis langsung ke `.env`. Kunci yang
 * pernah muncul di layar, log, atau catatan percakapan harus dianggap tak lagi
 * rahasia -- dan itulah sebabnya skrip ini ada.
 *
 * URUTAN YANG DISENGAJA: basis data lebih dulu, baru lampiran, baru `.env`.
 * `.env` ditulis PALING AKHIR supaya bila ada yang gagal di tengah, aplikasi
 * masih memakai kunci lama dan data yang belum tersentuh tetap terbaca.
 *
 * Pemakaian:
 *   pnpm rotasi:kunci -- --uji     (wajib lebih dulu; tak menulis apa pun)
 *   pnpm rotasi:kunci
 */
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const { kunciDariEnv, INFO_LAMPIRAN, INFO_KOLOM } = require('./lib/envelope.cjs');
const { putarBlob } = require('./lib/rotasi.cjs');

const AWALAN = 'enc:v1:';
const UKURAN_BATCH = 200;
const HANYA_LAPORAN = process.argv.includes('--uji');

const sidikJari = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);

function telusuri(dir) {
  const hasil = [];
  if (!fs.existsSync(dir)) {
    return hasil;
  }
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      hasil.push(...telusuri(p));
    } else if (e.isFile()) {
      hasil.push(p);
    }
  }
  return hasil;
}

/** Kolom disimpan sebagai `enc:v1:<base64url>`; blobnya dibungkus/dibuka di sini. */
function putarKolom(tersimpan, lama, baru) {
  if (tersimpan === '') {
    return { nilai: '', status: 'kosong' };
  }
  const blobMasuk = tersimpan.startsWith(AWALAN)
    ? Buffer.from(tersimpan.slice(AWALAN.length), 'base64url')
    : Buffer.from(tersimpan, 'utf8');
  const hasil = putarBlob(blobMasuk, lama, baru, INFO_KOLOM);
  return { nilai: AWALAN + hasil.blob.toString('base64url'), status: hasil.status };
}

function tulisKunciBaruKeEnv(berkasEnv, hexBaru) {
  const isi = fs.readFileSync(berkasEnv, 'utf8');
  const pola = /^([ \t]*DATA_ENCRYPTION_KEY=).*$/m;
  if (!pola.test(isi)) {
    throw new Error(`Tak menemukan baris DATA_ENCRYPTION_KEY di ${berkasEnv}`);
  }
  // Salinan berstempel waktu, BUKAN ditimpa: kunci lama tetap diperlukan bila
  // rotasi ternyata belum tuntas dan harus dilanjutkan.
  const cadangan = `${berkasEnv}.sebelum-rotasi-${Date.now()}`;
  fs.copyFileSync(berkasEnv, cadangan);
  fs.writeFileSync(berkasEnv, isi.replace(pola, `$1${hexBaru}`));
  return cadangan;
}

async function utama() {
  const lama = kunciDariEnv('DATA_ENCRYPTION_KEY');

  const argBaru = process.argv.indexOf('--kunci-baru');
  const hexBaru =
    argBaru !== -1 && process.argv[argBaru + 1]
      ? process.argv[argBaru + 1]
      : randomBytes(32).toString('hex');
  if (!/^[0-9a-fA-F]{64}$/.test(hexBaru)) {
    throw new Error('--kunci-baru harus 64 karakter heksadesimal');
  }
  const baru = Buffer.from(hexBaru, 'hex');

  if (baru.equals(lama)) {
    throw new Error('Kunci baru sama dengan kunci lama. Tak ada yang dirotasi.');
  }

  console.log(HANYA_LAPORAN ? 'MODE UJI: tak ada yang ditulis.\n' : 'MODE TULIS.\n');
  // SIDIK JARI, bukan kuncinya. Cukup untuk mencocokkan, tak cukup untuk membuka.
  console.log(`Kunci lama (sidik jari) : ${sidikJari(lama)}`);
  console.log(`Kunci baru (sidik jari) : ${sidikJari(baru)}`);
  console.log('');

  const prisma = new PrismaClient();
  const hitung = { uraian: 0, pesan: 0, lampiran: 0, dilewati: 0, polos: 0 };

  try {
    // --- 1. BASIS DATA, lebih dulu ---
    for (const [nama, model, kolom] of [
      ['complaints.uraian', prisma.complaint, 'uraian'],
      ['complaint_replies.pesan', prisma.complaintReply, 'pesan'],
    ]) {
      const baris = await model.findMany({ select: { id: true, [kolom]: true } });
      const perubahan = [];
      for (const b of baris) {
        const hasil = putarKolom(b[kolom], lama, baru);
        if (hasil.status === 'kosong') {
          continue;
        }
        if (hasil.status === 'sudah') {
          hitung.dilewati += 1;
          continue;
        }
        if (hasil.status === 'polos') {
          hitung.polos += 1;
        }
        perubahan.push({ id: b.id, nilai: hasil.nilai });
      }
      console.log(`${nama}: ${baris.length} baris, ${perubahan.length} perlu diputar.`);

      if (!HANYA_LAPORAN) {
        for (let i = 0; i < perubahan.length; i += UKURAN_BATCH) {
          const potongan = perubahan.slice(i, i + UKURAN_BATCH);
          await prisma.$transaction(
            potongan.map((p) => model.update({ where: { id: p.id }, data: { [kolom]: p.nilai } })),
          );
        }
      }
      hitung[kolom] += perubahan.length;
    }

    // --- 2. LAMPIRAN ---
    const dirUnggahan = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
    const berkas = telusuri(dirUnggahan);
    let perluBerkas = 0;
    for (const jalur of berkas) {
      const hasil = putarBlob(fs.readFileSync(jalur), lama, baru, INFO_LAMPIRAN);
      if (hasil.status === 'sudah') {
        hitung.dilewati += 1;
        continue;
      }
      if (hasil.status === 'polos') {
        hitung.polos += 1;
      }
      perluBerkas += 1;
      if (!HANYA_LAPORAN) {
        // Berkas sementara lalu `rename`: berkas tak pernah tinggal separuh.
        const sementara = `${jalur}.rotasi-sementara`;
        fs.writeFileSync(sementara, hasil.blob);
        fs.renameSync(sementara, jalur);
      }
    }
    console.log(`lampiran: ${berkas.length} berkas, ${perluBerkas} perlu diputar.`);
    hitung.lampiran += perluBerkas;
  } finally {
    await prisma.$disconnect();
  }

  console.log('');
  if (HANYA_LAPORAN) {
    console.log(`Akan diputar : ${hitung.uraian + hitung.pesan + hitung.lampiran}`);
    console.log(`Sudah berkunci baru : ${hitung.dilewati}`);
    console.log(`Masih polos (akan ikut dienkripsi) : ${hitung.polos}`);
    console.log('');
    console.log('Tak ada yang berubah. Jalankan tanpa --uji untuk menulis.');
    return;
  }

  // --- 3. .env, PALING AKHIR ---
  const berkasEnv = path.resolve(process.cwd(), '.env');
  const cadanganEnv = tulisKunciBaruKeEnv(berkasEnv, hexBaru);

  console.log(`Diputar      : ${hitung.uraian + hitung.pesan + hitung.lampiran}`);
  console.log(`Dilewati     : ${hitung.dilewati}`);
  console.log('');
  console.log(`DATA_ENCRYPTION_KEY di .env sudah diganti (nilainya tidak dicetak).`);
  console.log(`Salinan .env sebelum rotasi: ${path.basename(cadanganEnv)}`);
  console.log('');
  console.log('LANGKAH BERIKUTNYA, jangan dilewati:');
  console.log('  1. Restart aplikasi supaya ia memakai kunci baru.');
  console.log('  2. Buat ulang cadangan (`pnpm cadangan`) -- cadangan lama memuat');
  console.log('     lampiran berkunci LAMA, jadi ia tak dapat dipulihkan dengan kunci baru.');
  console.log('  3. Hapus cadangan lama SESUDAH cadangan baru terbukti dapat dipulihkan.');
  console.log('  4. Simpan kunci baru ke tempat cadangan kunci Anda, lalu hapus salinan');
  console.log('     .env di atas begitu rotasi terbukti tuntas.');
}

utama().catch((err) => {
  console.error('');
  console.error(`GAGAL: ${err.message}`);
  console.error('');
  console.error('Data yang SUDAH diputar memakai kunci baru, sisanya masih kunci lama.');
  console.error('`.env` belum disentuh bila kegagalannya terjadi sebelum langkah terakhir,');
  console.error('jadi aplikasi masih memakai kunci lama. Jalankan ulang skrip ini untuk');
  console.error('menuntaskan sisanya -- ia aman diulang.');
  process.exit(1);
});
