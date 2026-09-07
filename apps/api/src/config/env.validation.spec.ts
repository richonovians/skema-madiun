// `enableImplicitConversion` pada validateEnv membaca `design:type` lewat
// Reflect, dan di runtime yang memuat polyfill-nya @nestjs/core. Spec ini tak
// menyentuh Nest sama sekali, jadi ia harus memuatnya sendiri -- tanpa ini
// setiap kasus gagal dengan "Reflect.getMetadata is not a function", bukan
// karena validasinya.
import 'reflect-metadata';
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
