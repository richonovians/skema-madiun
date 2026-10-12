import { NAMA_DB_UJI, pastikanHostLokal, sasaranDbUji } from './url-db-uji';

/**
 * URL basis data uji diturunkan dari `DATABASE_URL` milik tiap pengembang,
 * bukan dibaca dari entri `.env` tersendiri. Itu keputusan sengaja: tak seorang
 * pun di tim perlu menyunting `.env` mereka, dan sandi siapa pun tetap terpakai.
 *
 * Penurunannya dilakukan dengan bedah teks, BUKAN `new URL()`. `new URL()`
 * menormalkan ulang bagian kredensial, sehingga sandi berisi karakter
 * berpersentase bisa keluar berbeda dari yang masuk dan sambungannya gagal
 * dengan pesan "password authentication failed" yang menyesatkan.
 */
describe('sasaranDbUji', () => {
  const dev = 'postgresql://skm:skm_dev_password@localhost:5432/skm_db?schema=public';

  it('menukar nama basis data dan mempertahankan sisanya apa adanya', () => {
    expect(sasaranDbUji(dev).url).toBe(
      'postgresql://skm:skm_dev_password@localhost:5432/skm_uji?schema=public',
    );
  });

  it('menyebut nama basis data uji, untuk CREATE DATABASE', () => {
    expect(sasaranDbUji(dev).nama).toBe(NAMA_DB_UJI);
  });

  it('menunjuk basis data pemeliharaan postgres, tempat CREATE DATABASE dijalankan', () => {
    expect(sasaranDbUji(dev).urlPemeliharaan).toBe(
      'postgresql://skm:skm_dev_password@localhost:5432/postgres?schema=public',
    );
  });

  it('bekerja tanpa query string', () => {
    expect(sasaranDbUji('postgresql://skm:p@localhost:5432/skm_db').url).toBe(
      'postgresql://skm:p@localhost:5432/skm_uji',
    );
  });

  it('mempertahankan sandi berkarakter khusus byte demi byte', () => {
    const sandiAneh = 'postgresql://skm:a%2Fb%40c%3Fd@localhost:5432/skm_db?schema=public';
    expect(sasaranDbUji(sandiAneh).url).toBe(
      'postgresql://skm:a%2Fb%40c%3Fd@localhost:5432/skm_uji?schema=public',
    );
  });

  it('mempertahankan beberapa parameter query sekaligus', () => {
    const banyak = 'postgresql://skm:p@localhost:5432/skm_db?schema=public&connection_limit=5';
    expect(sasaranDbUji(banyak).url).toBe(
      'postgresql://skm:p@localhost:5432/skm_uji?schema=public&connection_limit=5',
    );
  });

  it('menerima skema postgres:// selain postgresql://', () => {
    expect(sasaranDbUji('postgres://skm:p@localhost:5432/skm_db').url).toBe(
      'postgres://skm:p@localhost:5432/skm_uji',
    );
  });

  // SASARAN YANG SUDAH TERPISAH BUKAN KESALAHAN KONFIGURASI.
  //
  // Versi pertama melempar galat di sini, dengan alasan bahwa penurunan yang
  // menghasilkan nama yang sama berarti uji dan pengembangan tak terpisah. Itu
  // keliru, dan harganya langsung terlihat: `.github/workflows/ci.yml` sudah
  // memakai basis data tersendiri bernama `skm_uji` jauh sebelum pelari ini
  // ada, sehingga job "E2E API" mati sebelum jest jalan pada dorongan pertama
  // (`aae9b1e`). `DATABASE_URL` yang sudah menunjuk basis data uji berarti
  // tujuannya SUDAH tercapai, jadi ia dipakai apa adanya.
  describe('DATABASE_URL yang sudah menunjuk basis data uji', () => {
    const sudah = 'postgresql://skm:skm@localhost:5432/skm_uji?schema=public';

    it('diterima, tidak dilempar', () => {
      expect(() => sasaranDbUji(sudah)).not.toThrow();
    });

    it('dipakai apa adanya, byte demi byte', () => {
      expect(sasaranDbUji(sudah).url).toBe(sudah);
    });

    it('ditandai sudahTerpisah, supaya CREATE DATABASE dilewati', () => {
      expect(sasaranDbUji(sudah).sudahTerpisah).toBe(true);
    });

    it('sasaran yang DITURUNKAN tidak ditandai sudahTerpisah', () => {
      expect(sasaranDbUji(dev).sudahTerpisah).toBe(false);
    });
  });

  it('menolak URL tanpa nama basis data', () => {
    expect(() => sasaranDbUji('postgresql://skm:p@localhost:5432/')).toThrow(/nama basis data/);
  });

  it('menolak URL yang bukan Postgres', () => {
    expect(() => sasaranDbUji('mysql://skm:p@localhost:3306/skm_db')).toThrow(/Postgres/);
  });

  it('menolak DATABASE_URL yang kosong', () => {
    expect(() => sasaranDbUji('')).toThrow(/DATABASE_URL/);
  });
});

/**
 * Pelari uji MEMBUAT basis data dan menulis baris ke dalamnya. Dua perbuatan itu
 * tak boleh pernah mengenai server selain mesin pengembang. Aturan tetap proyek
 * sudah menyatakannya, tetapi aturan tak menahan salah ketik -- palang ini yang
 * menahannya.
 */
describe('pastikanHostLokal', () => {
  it.each([
    'postgresql://skm:p@localhost:5432/skm_db',
    'postgresql://skm:p@127.0.0.1:5432/skm_db',
    'postgresql://skm:p@[::1]:5432/skm_db',
    'postgresql://skm:p@localhost/skm_db',
  ])('meloloskan host lokal: %s', (url) => {
    expect(() => pastikanHostLokal(url)).not.toThrow();
  });

  it.each([
    'postgresql://skm:p@db.madiunkab.go.id:5432/skm_db',
    'postgresql://skm:p@10.0.0.5:5432/skm_db',
    'postgresql://skm:p@localhost.example.com:5432/skm_db',
  ])('menolak host bukan lokal: %s', (url) => {
    expect(() => pastikanHostLokal(url)).toThrow(/bukan mesin ini/);
  });

  // Sandi yang memuat '@' dalam bentuk persentase pernah membuat pengurai naif
  // membaca potongan sandi sebagai nama host, lalu meloloskan URL produksi.
  it('membaca host sesudah pemisah kredensial TERAKHIR', () => {
    expect(() => pastikanHostLokal('postgresql://skm:a%40b@10.0.0.5:5432/skm_db')).toThrow(
      /bukan mesin ini/,
    );
    expect(() => pastikanHostLokal('postgresql://skm:a%40b@localhost:5432/skm_db')).not.toThrow();
  });
});
