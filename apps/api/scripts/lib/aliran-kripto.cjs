'use strict';
const { createCipheriv, createDecipheriv, hkdfSync, randomBytes } = require('node:crypto');
const fs = require('node:fs');
const { pipeline } = require('node:stream/promises');
const { Transform } = require('node:stream');

/**
 * Amplop BERALIRAN untuk berkas cadangan (23 September 2026).
 *
 * MENGAPA TERPISAH DARI envelope.cjs. Amplop biasa menyangga seluruh isi di
 * memori, dan itu tepat untuk lampiran 5MB. Dump basis data tak punya batas
 * atas seperti itu: ia tumbuh seiring pemakaian sistem, dan cadangan yang
 * gagal karena kehabisan memori adalah cadangan yang tak ada persis pada saat
 * ia paling dibutuhkan.
 *
 * FORMATNYA SAMA dengan envelope.cjs -- magic, versi, garam, iv, tag, lalu
 * ciphertext -- KECUALI satu hal yang tak terhindarkan: tag GCM baru ada
 * sesudah bita terakhir melewati cipher, sedangkan tempatnya di header sudah
 * ditulis lebih dulu. Karena itu header ditulis dengan tag NOL, lalu tag yang
 * sebenarnya ditambalkan ke offset 33 setelah aliran tuntas. Berkas yang
 * prosesnya mati di tengah akan punya tag nol, dan tag nol tak pernah
 * terverifikasi -- gagal ke arah yang benar.
 *
 * PEMULIHAN MENULIS KE BERKAS SEMENTARA dan baru me-`rename`-nya sesudah tag
 * terverifikasi. Inilah yang membuat janji "diverifikasi tuntas sebelum
 * dipakai" benar-benar berlaku: tak pernah ada berkas bernama tujuan yang
 * isinya belum terbukti.
 */
const MAGIC = Buffer.from('SKM1', 'ascii');
const VERSI = 0x01;
const PANJANG_GARAM = 16;
const PANJANG_IV = 12;
const PANJANG_TAG = 16;
const OFFSET_TAG = MAGIC.length + 1 + PANJANG_GARAM + PANJANG_IV;
const PANJANG_HEADER = OFFSET_TAG + PANJANG_TAG;

function turunkanKunci(kunciInduk, garam, info) {
  return Buffer.from(hkdfSync('sha256', kunciInduk, garam, Buffer.from(info, 'utf8'), 32));
}

/**
 * Mengenkripsi `sumber` (Readable) ke berkas `tujuan`.
 * Mengembalikan jumlah bita plaintext yang terbaca.
 */
async function enkripsiAliran(sumber, tujuan, kunciInduk, info) {
  const garam = randomBytes(PANJANG_GARAM);
  const iv = randomBytes(PANJANG_IV);
  const cipher = createCipheriv('aes-256-gcm', turunkanKunci(kunciInduk, garam, info), iv);

  let bita = 0;
  const hitung = new Transform({
    transform(potongan, _enc, cb) {
      bita += potongan.length;
      cb(null, potongan);
    },
  });

  const keluar = fs.createWriteStream(tujuan);
  // Tag masih nol di sini; ditambalkan sesudah aliran tuntas.
  keluar.write(Buffer.concat([MAGIC, Buffer.from([VERSI]), garam, iv, Buffer.alloc(PANJANG_TAG)]));

  await pipeline(sumber, hitung, cipher, keluar);

  const fd = fs.openSync(tujuan, 'r+');
  try {
    fs.writeSync(fd, cipher.getAuthTag(), 0, PANJANG_TAG, OFFSET_TAG);
  } finally {
    fs.closeSync(fd);
  }
  return bita;
}

/**
 * Mendekripsi berkas `sumber` ke `tujuan`, dan MELEMPAR bila tagnya tak cocok.
 * Berkas `tujuan` tak pernah ada kecuali verifikasinya lolos.
 */
async function dekripsiAliran(sumber, tujuan, kunciInduk, info) {
  const fd = fs.openSync(sumber, 'r');
  const header = Buffer.alloc(PANJANG_HEADER);
  try {
    const terbaca = fs.readSync(fd, header, 0, PANJANG_HEADER, 0);
    if (terbaca < PANJANG_HEADER) {
      throw new Error('Berkas terlalu pendek untuk memuat header amplop');
    }
  } finally {
    fs.closeSync(fd);
  }

  if (!header.subarray(0, MAGIC.length).equals(MAGIC) || header[MAGIC.length] !== VERSI) {
    throw new Error('Berkas bukan format amplop SKM1 v1');
  }

  let p = MAGIC.length + 1;
  const garam = header.subarray(p, (p += PANJANG_GARAM));
  const iv = header.subarray(p, (p += PANJANG_IV));
  const tag = header.subarray(p, (p += PANJANG_TAG));

  const decipher = createDecipheriv('aes-256-gcm', turunkanKunci(kunciInduk, garam, info), iv);
  decipher.setAuthTag(tag);

  const sementara = `${tujuan}.belum-terverifikasi`;
  try {
    await pipeline(
      fs.createReadStream(sumber, { start: PANJANG_HEADER }),
      decipher,
      fs.createWriteStream(sementara),
    );
  } catch (err) {
    // `decipher` melempar di `final()` bila tag tak cocok, dan pipeline
    // meneruskannya ke sini. Berkas separuh dibuang; tujuan tak pernah dibuat.
    try {
      fs.unlinkSync(sementara);
    } catch {
      /* memang tak sempat dibuat */
    }
    throw err;
  }
  fs.renameSync(sementara, tujuan);
}

module.exports = { PANJANG_HEADER, enkripsiAliran, dekripsiAliran };
