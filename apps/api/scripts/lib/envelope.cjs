'use strict';
const { createCipheriv, createDecipheriv, hkdfSync, randomBytes } = require('node:crypto');

/**
 * Salinan format amplop untuk skrip baris perintah (23 September 2026).
 *
 * SUMBER KEBENARANNYA src/common/crypto/envelope.ts. Berkas ini ada karena
 * skrip migrasi, cadangan, dan pemulihan berjalan di luar kompilasi TypeScript.
 * Menjalankannya lewat `ts-node` akan membuat perkakas PEMULIHAN bergantung
 * pada rantai build -- yang justru mungkin sedang rusak persis pada saat
 * pemulihan dibutuhkan.
 *
 * COMMONJS, BUKAN ESM, dan itu disengaja: dengan begini Jest dapat me-`require`
 * berkas ini langsung, sehingga uji silang di
 * src/common/crypto/envelope.silang.spec.ts benar-benar dapat berjalan. Sebuah
 * salinan tanpa uji silang bukan salinan, melainkan bom waktu.
 *
 * DUA IMPLEMENTASI YANG DAPAT MENYIMPANG ADALAH BAHAYA NYATA, dan di sini
 * akibatnya adalah cadangan yang tak dapat dibuka. Uji silang itu mengenkripsi
 * dengan yang satu dan mendekripsi dengan yang lain, kedua arah. Selama ia
 * hijau, kedua berkas sepakat. Bila Anda mengubah format di salah satunya,
 * uji itu yang memberi tahu -- bukan operator yang sedang memulihkan data.
 */
const MAGIC = Buffer.from('SKM1', 'ascii');
const VERSI = 0x01;
const PANJANG_GARAM = 16;
const PANJANG_IV = 12;
const PANJANG_TAG = 16;

const PANJANG_HEADER = MAGIC.length + 1 + PANJANG_GARAM + PANJANG_IV + PANJANG_TAG;

const INFO_LAMPIRAN = 'skm-lampiran-v1';
const INFO_KOLOM = 'skm-kolom-v1';
const INFO_CADANGAN = 'skm-cadangan-v1';

function turunkanKunci(kunciInduk, garam, info) {
  return Buffer.from(hkdfSync('sha256', kunciInduk, garam, Buffer.from(info, 'utf8'), 32));
}

function enkripsi(data, kunciInduk, info) {
  const garam = randomBytes(PANJANG_GARAM);
  const iv = randomBytes(PANJANG_IV);
  const cipher = createCipheriv('aes-256-gcm', turunkanKunci(kunciInduk, garam, info), iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([MAGIC, Buffer.from([VERSI]), garam, iv, cipher.getAuthTag(), ciphertext]);
}

function terenkripsi(data) {
  return (
    data.length >= PANJANG_HEADER &&
    data.subarray(0, MAGIC.length).equals(MAGIC) &&
    data[MAGIC.length] === VERSI
  );
}

function dekripsi(blob, kunciInduk, info) {
  if (!terenkripsi(blob)) {
    throw new Error('Blob bukan format envelope SKM1 v1');
  }
  let p = MAGIC.length + 1;
  const garam = blob.subarray(p, (p += PANJANG_GARAM));
  const iv = blob.subarray(p, (p += PANJANG_IV));
  const tag = blob.subarray(p, (p += PANJANG_TAG));
  const decipher = createDecipheriv('aes-256-gcm', turunkanKunci(kunciInduk, garam, info), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(blob.subarray(p)), decipher.final()]);
}

/**
 * Kunci induk dari lingkungan.
 *
 * TIDAK ADA kunci uji tetap di sini, berbeda dengan src/common/crypto/kunci.ts.
 * Perkakas yang menulis ke data sungguhan tak boleh punya jalan mundur yang
 * diam-diam memakai kunci palsu: yang terjadi kemudian bukan uji yang gagal,
 * melainkan data sungguhan yang terenkripsi dengan kunci yang tak seorang pun
 * simpan.
 */
function kunciDariEnv(nama) {
  const hex = process.env[nama] || '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      `${nama} belum disetel atau bukan 64 karakter heksadesimal.\n` +
        'Jalankan skrip ini lewat perintah `pnpm` yang sudah memuat .env, ' +
        `atau setel ${nama} di lingkungan.`,
    );
  }
  return Buffer.from(hex, 'hex');
}

module.exports = {
  PANJANG_HEADER,
  INFO_LAMPIRAN,
  INFO_KOLOM,
  INFO_CADANGAN,
  enkripsi,
  dekripsi,
  terenkripsi,
  kunciDariEnv,
};
