#!/usr/bin/env node
'use strict';
/**
 * Mengenkripsi baris `complaints.uraian` dan `complaint_replies.pesan` yang
 * tersimpan SEBELUM enkripsi kolom dinyalakan (23 September 2026).
 *
 * INI SKRIP YANG MENULIS KE DATA SUNGGUHAN, dan satu-satunya di rangkaian ini
 * yang mengubah isi basis data. Karena itu ia:
 *
 *   - BERMODE UJI LEBIH DULU (`--uji`), yang membaca dan melaporkan tanpa
 *     menulis satu baris pun, DAN membuktikan pulang-pergi tiap baris di memori
 *     sebelum apa pun disimpan. Baris yang tak dapat didekripsi kembali
 *     dilaporkan dan menggagalkan seluruh lari;
 *   - IDEMPOTEN. Baris yang sudah berawalan `enc:v1:` dilewati, jadi lari kedua
 *     aman dan merupakan cara memastikan lari pertama tuntas;
 *   - MENULIS PER TRANSAKSI KECIL, bukan satu transaksi raksasa yang
 *     menggantung basis data dan gagal seluruhnya di baris terakhir.
 *
 * JALANKAN SESUDAH `pnpm cadangan` DAN SESUDAH cadangan itu terbukti dapat
 * dipulihkan. Bukan sebelum.
 *
 * Pemakaian:
 *   pnpm enkripsi:kolom -- --uji     (wajib dijalankan lebih dulu)
 *   pnpm enkripsi:kolom
 */
const { PrismaClient } = require('@prisma/client');
const { kunciDariEnv } = require('./lib/envelope.cjs');
const { enkripsi, dekripsi, INFO_KOLOM } = require('./lib/envelope.cjs');

const AWALAN = 'enc:v1:';
const UKURAN_BATCH = 200;
const HANYA_LAPORAN = process.argv.includes('--uji');

function enkripsiKolom(teks, kunci) {
  if (teks === '' || teks.startsWith(AWALAN)) {
    return teks;
  }
  return AWALAN + enkripsi(Buffer.from(teks, 'utf8'), kunci, INFO_KOLOM).toString('base64url');
}

function dekripsiKolom(tersimpan, kunci) {
  if (!tersimpan.startsWith(AWALAN)) {
    return tersimpan;
  }
  return dekripsi(
    Buffer.from(tersimpan.slice(AWALAN.length), 'base64url'),
    kunci,
    INFO_KOLOM,
  ).toString('utf8');
}

async function prosesTabel(prisma, nama, model, kolom, kunci) {
  const baris = await model.findMany({ select: { id: true, [kolom]: true } });
  const perlu = baris.filter((b) => b[kolom] !== '' && !b[kolom].startsWith(AWALAN));

  console.log(`${nama}: ${baris.length} baris, ${perlu.length} perlu dienkripsi.`);

  // PULANG-PERGI DIBUKTIKAN DI MEMORI LEBIH DULU, untuk SETIAP baris. Sebuah
  // baris yang terenkripsi tetapi tak dapat dibuka kembali adalah kehilangan
  // data permanen, dan menemukannya sesudah tersimpan sudah terlambat.
  for (const b of perlu) {
    const bolakBalik = dekripsiKolom(enkripsiKolom(b[kolom], kunci), kunci);
    if (bolakBalik !== b[kolom]) {
      throw new Error(`${nama} id=${b.id}: pulang-pergi TIDAK cocok. Seluruh lari dibatalkan.`);
    }
  }
  console.log(`${nama}: pulang-pergi terbukti untuk ${perlu.length} baris.`);

  if (HANYA_LAPORAN) {
    return { diubah: 0, dilewati: baris.length - perlu.length, akanDiubah: perlu.length };
  }

  let diubah = 0;
  for (let i = 0; i < perlu.length; i += UKURAN_BATCH) {
    const potongan = perlu.slice(i, i + UKURAN_BATCH);
    await prisma.$transaction(
      potongan.map((b) =>
        model.update({
          where: { id: b.id },
          data: { [kolom]: enkripsiKolom(b[kolom], kunci) },
        }),
      ),
    );
    diubah += potongan.length;
    console.log(`${nama}: ${diubah}/${perlu.length}`);
  }
  return { diubah, dilewati: baris.length - perlu.length, akanDiubah: perlu.length };
}

async function utama() {
  const kunci = kunciDariEnv('DATA_ENCRYPTION_KEY');
  const prisma = new PrismaClient();
  try {
    console.log(HANYA_LAPORAN ? 'MODE UJI: tak ada yang ditulis.\n' : 'MODE TULIS.\n');

    const a = await prosesTabel(prisma, 'complaints.uraian', prisma.complaint, 'uraian', kunci);
    const b = await prosesTabel(
      prisma,
      'complaint_replies.pesan',
      prisma.complaintReply,
      'pesan',
      kunci,
    );

    console.log('');
    if (HANYA_LAPORAN) {
      console.log(`Akan dienkripsi : ${a.akanDiubah + b.akanDiubah} baris`);
      console.log(`Sudah aman      : ${a.dilewati + b.dilewati} baris`);
      console.log('');
      console.log('Tak ada yang berubah. Jalankan tanpa --uji untuk menulis.');
    } else {
      console.log(`Dienkripsi      : ${a.diubah + b.diubah} baris`);
      console.log(`Sudah aman      : ${a.dilewati + b.dilewati} baris`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

utama().catch((err) => {
  console.error('');
  console.error(`GAGAL: ${err.message}`);
  process.exit(1);
});
