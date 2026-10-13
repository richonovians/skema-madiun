import { NAMA_DB_BEBAN, pastikanSasaranBeban, redisBeban, sasaranDbBeban } from './sasaran-beban';

/**
 * Basis data uji beban DIPISAH dari basis data uji e2e, dan itu keputusan
 * sengaja: `skm_uji` dibuang lalu di-seed ulang setiap kali `test:e2e` jalan,
 * sedangkan dataset beban mahal dibangun -- jutaan baris -- dan harus bertahan
 * di antara pengukuran.
 */
describe('sasaranDbBeban', () => {
  const dev = 'postgresql://skm:skm_dev_password@localhost:5432/skm_db?schema=public';

  it('menukar nama basis data menjadi skm_beban', () => {
    expect(sasaranDbBeban(dev)).toBe(
      'postgresql://skm:skm_dev_password@localhost:5432/skm_beban?schema=public',
    );
  });

  it('mempertahankan sandi berkarakter khusus byte demi byte', () => {
    expect(sasaranDbBeban('postgresql://skm:a%2Fb%40c@localhost:5432/skm_db')).toBe(
      'postgresql://skm:a%2Fb%40c@localhost:5432/skm_beban',
    );
  });

  it('idempoten: URL yang sudah menunjuk skm_beban keluar sama', () => {
    const sudah = `postgresql://skm:p@localhost:5432/${NAMA_DB_BEBAN}`;
    expect(sasaranDbBeban(sudah)).toBe(sudah);
  });

  it('menolak host bukan lokal', () => {
    expect(() => sasaranDbBeban('postgresql://skm:p@10.0.0.5:5432/skm_db')).toThrow(
      /bukan mesin ini/,
    );
  });
});

/**
 * PALANG DI TITIK TULIS, bukan di titik rangkai string.
 *
 * `sasaranDbBeban` hanya menjamin teks URL-nya. Yang menentukan ke mana baris
 * benar-benar ditulis adalah sambungan yang terbuka, dan itu hanya dapat
 * ditanyakan kepada servernya lewat `SELECT current_database()`. Pembangun
 * dataset menulis jutaan baris; ia memeriksa jawaban server itu sebelum baris
 * pertama, bukan memercayai string yang ia susun sendiri.
 */
describe('pastikanSasaranBeban', () => {
  it('meloloskan basis data yang benar', () => {
    expect(() => pastikanSasaranBeban(NAMA_DB_BEBAN)).not.toThrow();
  });

  it.each(['skm_db', 'skm_uji', 'postgres', ''])('menolak basis data lain: %s', (nama) => {
    expect(() => pastikanSasaranBeban(nama)).toThrow(/skm_beban/);
  });

  // Inilah yang paling mahal bila lolos: `skm_db` memuat data pengembangan
  // pengguna, dan jutaan baris uji beban di sana tak dapat dibersihkan oleh
  // skrip mana pun yang ada.
  it('menyebut nama yang salah di pesannya, supaya terbaca saat gagal', () => {
    expect(() => pastikanSasaranBeban('skm_db')).toThrow(/skm_db/);
  });
});

/**
 * REDIS JUGA HARUS DIPISAH, dan ini terukur, bukan kehati-hatian teoretis.
 *
 * Jalan beban pertama (13 Oktober 2026) menulis `singgahan:ikm-hasil:6` ke
 * Redis yang SAMA dengan yang dibaca aplikasi dev. Survei id 6 ada di `skm_db`
 * maupun `skm_beban` dengan isi berbeda, jadi angka IKM yang dilihat pengguna
 * di layar sempat berasal dari dataset beban. Ia pulih sendiri dalam 60 detik
 * karena TTL singgahan, tetapi akan terulang setiap jalan.
 *
 * Kuncinya tak membawa pembeda basis data, dan itu bukan hal yang hendak
 * diperbaiki dari sini. Yang dilakukan di sini memisahkan seluruh ruang kunci
 * lewat nomor basis data logis Redis -- satu angka di ujung URL, tanpa satu
 * baris pun kode aplikasi berubah. Itu memisahkan singgahan, penghitung batas
 * laju, sesi, dan daftar pencabutan lampiran sekaligus.
 */
describe('redisBeban', () => {
  it.each([
    ['redis://127.0.0.1:6379', 'redis://127.0.0.1:6379/1'],
    ['redis://127.0.0.1:6379/0', 'redis://127.0.0.1:6379/1'],
    ['redis://127.0.0.1:6379/', 'redis://127.0.0.1:6379/1'],
    ['redis://:sandi@127.0.0.1:6379/0', 'redis://:sandi@127.0.0.1:6379/1'],
  ])('mengarahkan %s ke basis data logis 1', (masuk, keluar) => {
    expect(redisBeban(masuk)).toBe(keluar);
  });

  it('idempoten: yang sudah menunjuk /1 keluar sama', () => {
    expect(redisBeban('redis://127.0.0.1:6379/1')).toBe('redis://127.0.0.1:6379/1');
  });

  // Tanpa `REDIS_URL` aplikasinya memakai penyimpan singgahan NONAKTIF, dan
  // yang terukur menjadi sistem lain sama sekali -- tanpa singgahan, tanpa
  // batas laju di Redis. Lebih baik berhenti daripada melaporkan angka itu.
  it('menolak REDIS_URL yang kosong', () => {
    expect(() => redisBeban('')).toThrow(/REDIS_URL/);
  });
});
