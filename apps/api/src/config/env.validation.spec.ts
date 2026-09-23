// `enableImplicitConversion` pada validateEnv membaca `design:type` lewat
// Reflect, dan di runtime yang memuat polyfill-nya @nestjs/core. Spec ini tak
// menyentuh Nest sama sekali, jadi ia harus memuatnya sendiri -- tanpa ini
// setiap kasus gagal dengan "Reflect.getMetadata is not a function", bukan
// karena validasinya.
import 'reflect-metadata';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { validateEnv } from './env.validation';

/**
 * Boot HARUS gagal pada konfigurasi yang tak aman, bukan berjalan dengannya.
 *
 * T7 audit keamanan 7 September 2026: `SESSION_JWT_SECRET` dulu hanya
 * ber-`@IsNotEmpty()`, jadi rahasia satu karakter pun lolos dan aplikasi boot
 * normal. Rahasia itu menandatangani SELURUH token sesi; rahasia pendek dapat
 * ditebak paksa luar jaringan (tak ada batas laju yang menolongnya), dan siapa
 * pun yang menemukannya dapat menerbitkan token untuk peran apa pun.
 *
 * 32 karakter = 256 bit bila acak, sepadan dengan HS256 yang dipakai.
 */
const dasar = {
  NODE_ENV: 'development',
  PORT: 3001,
  DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
  SESSION_JWT_SECRET: 'a'.repeat(32),
};

describe('validateEnv — SESSION_JWT_SECRET', () => {
  it('menerima rahasia 32 karakter', () => {
    expect(() => validateEnv({ ...dasar })).not.toThrow();
  });

  it('MENOLAK rahasia lebih pendek dari 32 karakter', () => {
    expect(() => validateEnv({ ...dasar, SESSION_JWT_SECRET: 'rahasia-pendek' })).toThrow(
      /SESSION_JWT_SECRET/,
    );
  });

  it('tetap menolak rahasia kosong', () => {
    // Kontrol: `@IsNotEmpty()` yang lama tak boleh hilang tergantikan MinLength
    // -- string kosong memang juga < 32, tapi pesannya harus tetap jelas.
    expect(() => validateEnv({ ...dasar, SESSION_JWT_SECRET: '' })).toThrow(/SESSION_JWT_SECRET/);
  });
});

/**
 * NILAI CONTOH YANG LOLOS PENJAGA (23 September 2026).
 *
 * Panjang nilai contoh di `.env.example` TEPAT 32 karakter, jadi `@MinLength(32)`
 * dari temuan T7 di atas meloloskannya. Akibatnya `.env` yang disalin lalu tak
 * pernah disunting boot dengan normal, memakai rahasia yang tercatat di Git dan
 * terbaca siapa pun yang dapat membuka repositori ini.
 *
 * Rahasia itu menandatangani SELURUH token sesi (session.module.ts) DAN
 * menurunkan kunci HMAC untuk URL lampiran bertanda tangan (attachment-url.util.ts).
 * Token sesi diperiksa murni dari tanda tangannya -- tak ada catatan sesi di
 * basis data yang ikut dicocokkan -- jadi yang mengetahui rahasia ini dapat
 * menerbitkan token untuk id dan peran mana pun tanpa kata sandi.
 *
 * Ditemukan pada `.env` pengguna sendiri, bukan diduga-duga.
 */
const CONTOH_RAHASIA_SESI = 'ganti-dengan-string-acak-panjang';

describe('validateEnv — nilai contoh SESSION_JWT_SECRET', () => {
  it('MENOLAK nilai contoh meski panjangnya sudah memenuhi MinLength(32)', () => {
    // Premis yang membuat kasus ini perlu ada: panjangnya sendiri tak melanggar
    // aturan mana pun. Kalau suatu saat nilai contohnya diperpendek, penegasan
    // ini memerah dan memberi tahu bahwa kasus di bawahnya kehilangan maknanya.
    expect(CONTOH_RAHASIA_SESI.length).toBeGreaterThanOrEqual(32);

    expect(() => validateEnv({ ...dasar, SESSION_JWT_SECRET: CONTOH_RAHASIA_SESI })).toThrow(
      /SESSION_JWT_SECRET/,
    );
  });
});

describe('.env.example', () => {
  it('tidak memuat nilai SESSION_JWT_SECRET yang dapat dipakai', () => {
    // Mengikat berkas ke kode. Tanpa ini, nilai contoh yang dapat dipakai bisa
    // masuk lagi ke Git tanpa ada satu uji pun yang memerah.
    const isi = readFileSync(resolve(__dirname, '../../.env.example'), 'utf8');
    const cocok = isi.match(/^SESSION_JWT_SECRET=(.*)$/m);
    if (cocok === null) {
      throw new Error('Baris SESSION_JWT_SECRET tidak ditemukan di .env.example');
    }

    expect(cocok[1].trim().replace(/^["']|["']$/g, '')).toBe('');
  });
});
