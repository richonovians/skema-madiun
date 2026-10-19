import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';

/**
 * AES-256-GCM dengan kunci DITURUNKAN PER BLOB (23 September 2026).
 *
 * Satu-satunya tempat kripto simetris berjalan di proyek ini. Lampiran, kolom
 * basis data, dan cadangan memakai modul yang sama supaya tak ada dua
 * implementasi yang bisa diam-diam berbeda perilaku.
 *
 * MENGAPA BUKAN KUNCI INDUK LANGSUNG. AES-GCM runtuh total bila satu pasangan
 * kunci+nonce terpakai dua kali: penyerang memperoleh XOR kedua plaintext dan,
 * lebih buruk, dapat memalsukan tag untuk pesan yang tak pernah kita tulis.
 * Nonce 96-bit acak di bawah SATU kunci untuk ribuan lampiran membuat tabrakan
 * berhenti menjadi hal yang mustahil. Garam 128-bit per blob memindahkan setiap
 * blob ke kuncinya sendiri, sehingga pertanyaan itu tak pernah perlu dijawab
 * dan tak ada penghitung nonce yang harus dijaga lintas proses.
 *
 * `info` MEMISAHKAN DOMAIN PEMAKAIAN. Blob lampiran takkan pernah terbuka
 * dengan kunci kolom walau kunci induknya sama, sehingga perubahan format di
 * satu pemakaian tak dapat merembet menjadi blob yang sah di pemakaian lain.
 * Pola ini sudah dipakai proyek ini di attachment-url.util.ts
 * (`PEMISAH_DOMAIN`), jadi ia mengikuti kebiasaan yang ada.
 *
 * TAG DI HEADER, BUKAN DIIMBUHKAN DI AKHIR. Dekripsi membutuhkannya sebelum
 * `final()`; di akhir berkas ia menuntut pembacaan panjang berkas lebih dulu,
 * di offset tetap ia tidak. Tag bukan rahasia, jadi letaknya tak mengubah
 * keamanan apa pun.
 *
 * KEHILANGAN KUNCI INDUK BERARTI KEHILANGAN DATANYA. Tak ada pintu belakang di
 * sini, dan memang tak boleh ada. Lihat docs/keamanan/enkripsi-at-rest.md.
 */
const MAGIC = Buffer.from('SKM1', 'ascii');
const VERSI = 0x01;
const PANJANG_GARAM = 16;
const PANJANG_IV = 12;
const PANJANG_TAG = 16;

/** 4 + 1 + 16 + 12 + 16 = 49 byte sebelum ciphertext. */
export const PANJANG_HEADER = MAGIC.length + 1 + PANJANG_GARAM + PANJANG_IV + PANJANG_TAG;

export const INFO_LAMPIRAN = 'skm-lampiran-v1';
export const INFO_KOLOM = 'skm-kolom-v1';
export const INFO_CADANGAN = 'skm-cadangan-v1';

function turunkanKunci(kunciInduk: Buffer, garam: Buffer, info: string): Buffer {
  return Buffer.from(hkdfSync('sha256', kunciInduk, garam, Buffer.from(info, 'utf8'), 32));
}

export function enkripsi(data: Buffer, kunciInduk: Buffer, info: string): Buffer {
  const garam = randomBytes(PANJANG_GARAM);
  const iv = randomBytes(PANJANG_IV);
  const cipher = createCipheriv('aes-256-gcm', turunkanKunci(kunciInduk, garam, info), iv);
  const ciphertext = Buffer.concat([cipher.update(data), cipher.final()]);
  return Buffer.concat([MAGIC, Buffer.from([VERSI]), garam, iv, cipher.getAuthTag(), ciphertext]);
}

/**
 * Memeriksa PENANDA saja. Ia tidak, dan tidak dimaksudkan untuk, membuktikan
 * blobnya utuh -- itu tugas tag autentikasi, dan hanya `dekripsi` yang dapat
 * menjawabnya. Gunanya di sini adalah membedakan berkas lama yang masih polos
 * dari berkas yang sudah dienkripsi, tanpa perlu kunci.
 */
export function terenkripsi(data: Buffer): boolean {
  return (
    data.length >= PANJANG_HEADER &&
    data.subarray(0, MAGIC.length).equals(MAGIC) &&
    data[MAGIC.length] === VERSI
  );
}

export function dekripsi(blob: Buffer, kunciInduk: Buffer, info: string): Buffer {
  if (!terenkripsi(blob)) {
    throw new Error('Blob bukan format envelope SKM1 v1');
  }
  let p = MAGIC.length + 1;
  const garam = blob.subarray(p, (p += PANJANG_GARAM));
  const iv = blob.subarray(p, (p += PANJANG_IV));
  const tag = blob.subarray(p, (p += PANJANG_TAG));
  const decipher = createDecipheriv('aes-256-gcm', turunkanKunci(kunciInduk, garam, info), iv);
  decipher.setAuthTag(tag);
  // `final()` MELEMPAR bila tag tak cocok. Itulah yang diinginkan: kunci yang
  // salah dan berkas yang dirusak sama-sama gagal nyaring, bukan menghasilkan
  // sampah yang tampak seperti data.
  return Buffer.concat([decipher.update(blob.subarray(p)), decipher.final()]);
}
