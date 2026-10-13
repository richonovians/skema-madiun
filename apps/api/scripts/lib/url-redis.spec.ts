import { redisDbLogis, redisDbLogisBilaAda } from './url-redis';

/**
 * MENGAPA ADA BERKAS INI. Kunci singgahan di aplikasi ini tak membawa penanda
 * basis data (`singgahan:ikm-hasil:<id>`, `singgahan:ikm-dashboard:...`), jadi
 * dua proses yang menunjuk basis data Postgres BERBEDA tetap berbagi satu ruang
 * kunci Redis. Terukur dua kali: pelari beban sempat mencemari angka IKM
 * aplikasi dev, lalu e2e memerah karena tiga berkas spec berbagi kunci
 * dashboard yang sama dengan TTL 60 detik.
 *
 * Satu angka di ujung URL memisahkan SELURUH ruang kuncinya -- singgahan,
 * penghitung batas laju, sesi, daftar pencabutan lampiran -- tanpa satu baris
 * pun perubahan di kode aplikasi, karena klien-kliennya memakai `new Redis(url)`
 * dari ioredis yang menghormati jalur sebagai nomor basis data.
 */
describe('redisDbLogis', () => {
  it.each([
    ['tanpa jalur', 'redis://localhost:6379', 2, 'redis://localhost:6379/2'],
    ['berjalur 0', 'redis://localhost:6379/0', 2, 'redis://localhost:6379/2'],
    ['berjalur lain', 'redis://127.0.0.1:6379/5', 1, 'redis://127.0.0.1:6379/1'],
    ['dengan sandi', 'redis://:rahasia@localhost:6379', 3, 'redis://:rahasia@localhost:6379/3'],
    ['skema rediss', 'rediss://localhost:6380/0', 1, 'rediss://localhost:6380/1'],
  ])('%s', (_nama, masuk, db, keluar) => {
    expect(redisDbLogis(masuk, db)).toBe(keluar);
  });

  /**
   * Versi pertama `redisBeban` memakai `/[^/]*$/` dan memakan otoritasnya
   * sendiri ketika URL-nya tanpa jalur: garis miring terakhir di
   * `redis://host:6379` justru milik `//` pada skemanya, hasilnya `redis:/1`.
   */
  it('tidak memakan otoritas pada URL tanpa jalur', () => {
    expect(redisDbLogis('redis://host:6379', 1)).toBe('redis://host:6379/1');
  });

  it('idempoten: menerapkan dua kali menghasilkan hal yang sama', () => {
    const sekali = redisDbLogis('redis://localhost:6379/0', 2);
    expect(redisDbLogis(sekali, 2)).toBe(sekali);
  });

  it.each([
    ['kosong', ''],
    ['hanya spasi', '   '],
  ])('menolak URL %s', (_nama, url) => {
    expect(() => redisDbLogis(url, 1)).toThrow(/REDIS_URL/);
  });

  it('menolak URL yang tak dapat diurai', () => {
    expect(() => redisDbLogis('bukan-url', 1)).toThrow(/REDIS_URL/);
  });

  it.each([
    ['negatif', -1],
    ['bukan bulat', 1.5],
  ])('menolak nomor basis data %s', (_nama, db) => {
    expect(() => redisDbLogis('redis://localhost:6379', db)).toThrow(/basis data/i);
  });
});

/**
 * CI TAK PUNYA REDIS SAMA SEKALI, dan itu terbaca dari
 * `.github/workflows/ci.yml`: job "E2E API (PostgreSQL sungguhan)" hanya
 * menyediakan layanan `postgres` dan tak menyetel `REDIS_URL`. Tanpa cabang
 * ini, pelari e2e melempar di CI dan mematikan job-nya -- kegagalan yang persis
 * sama bentuknya dengan yang terjadi 12 Oktober 2026, ketika penjaga basis data
 * uji menolak `DATABASE_URL` milik CI.
 *
 * `undefined` berarti "jangan setel apa pun", sehingga aplikasi memakai
 * penyimpan singgahan NONAKTIF seperti yang sudah berlaku di CI hari ini.
 */
describe('redisDbLogisBilaAda', () => {
  it.each([
    ['tak diatur', undefined],
    ['kosong', ''],
    ['hanya spasi', '   '],
  ])('REDIS_URL %s -> undefined, bukan melempar', (_nama, url) => {
    expect(redisDbLogisBilaAda(url, 2)).toBeUndefined();
  });

  it('REDIS_URL terisi -> ditukar nomor basis datanya', () => {
    expect(redisDbLogisBilaAda('redis://localhost:6379/0', 2)).toBe('redis://localhost:6379/2');
  });

  it('URL terisi tetapi tak dapat diurai tetap MELEMPAR', () => {
    expect(() => redisDbLogisBilaAda('bukan-url', 2)).toThrow(/REDIS_URL/);
  });
});
