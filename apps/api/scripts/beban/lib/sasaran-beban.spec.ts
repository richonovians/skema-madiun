import {
  NAMA_DB_BEBAN,
  basisDataBelumAda,
  pastikanRedisBeban,
  pastikanSasaranBeban,
  redisBeban,
  sasaranDbBeban,
} from './sasaran-beban';

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

describe('basisDataBelumAda', () => {
  /**
   * BENTUK YANG DIUKUR, bukan yang diduga. Prisma 6.19.3 melempar
   * `PrismaClientInitializationError` TANPA `code`, TANPA `errorCode`, dan
   * tanpa `meta` ketika basis datanya belum ada -- diukur 13 Oktober 2026
   * terhadap Postgres 18. Versi pertama fungsi ini hanya memeriksa `P1003` dan
   * `3D000`, sehingga ia menjawab `false` pada galat yang sungguhan dan
   * prapenegasan di `siapkan-data.ts` akan melempar pada jalan pertama di mesin
   * baru -- memecahkan justru jalur yang hendak dijaga.
   */
  const galatNyata = (nama: string) => ({
    name: 'PrismaClientInitializationError',
    clientVersion: '6.19.3',
    errorCode: undefined,
    message: `
Invalid \`prisma.$queryRaw()\` invocation:


Database \`${nama}\` does not exist`,
  });

  it('mengenali galat Prisma yang sungguhan untuk basis data yang belum ada', () => {
    expect(basisDataBelumAda(galatNyata('skm_beban'), 'skm_beban')).toBe(true);
  });

  it('menolak galat yang menyebut basis data LAIN', () => {
    expect(basisDataBelumAda(galatNyata('skm_db'), 'skm_beban')).toBe(false);
  });

  it.each([
    ['kode P1003 di `code`', { code: 'P1003' }],
    ['kode P1003 di `errorCode`', { errorCode: 'P1003' }],
    ['SQLSTATE 3D000 di `code`', { code: '3D000' }],
    ['SQLSTATE 3D000 di `meta.code`', { code: 'P2010', meta: { code: '3D000' } }],
  ])('mengenali %s sebagai basis data yang belum ada', (_nama, err) => {
    expect(basisDataBelumAda(err, 'skm_beban')).toBe(true);
  });

  /**
   * INI YANG PALING PENTING DI BERKAS INI. Pemanggilnya melewatkan penegasan
   * sasaran ketika fungsi ini menjawab `true`, jadi jawaban `true` yang salah
   * MEMBUKA palangnya. Server tak terjangkau dan kata sandi salah harus tetap
   * melempar, bukan diam-diam dianggap "belum dibuat".
   */
  it.each([
    ['server tak terjangkau (P1001)', { code: 'P1001' }],
    ['autentikasi gagal (P1000)', { code: 'P1000' }],
    ['galat kueri biasa (P2010)', { code: 'P2010' }],
    ['SQLSTATE lain (42P01)', { code: '42P01' }],
    [
      'server tak terjangkau, bentuk nyata',
      {
        name: 'PrismaClientInitializationError',
        message: "Can't reach database server at `localhost:5432`",
      },
    ],
    [
      'autentikasi gagal, bentuk nyata',
      {
        name: 'PrismaClientInitializationError',
        message:
          'Authentication failed against database server, the provided database ' +
          'credentials for `skm` are not valid',
      },
    ],
    [
      'tabel tak ada, bukan basis data',
      {
        name: 'PrismaClientKnownRequestError',
        message: 'The table `public.surveys` does not exist in the current database.',
      },
    ],
  ])('TIDAK mengenali %s sebagai basis data yang belum ada', (_nama, err) => {
    expect(basisDataBelumAda(err, 'skm_beban')).toBe(false);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['string', 'P1003'],
    ['objek tanpa kode', {}],
  ])('menjawab false untuk %s', (_nama, err) => {
    expect(basisDataBelumAda(err, 'skm_beban')).toBe(false);
  });
});

/**
 * PALANG SEBELUM PENGOSONGAN REDIS, dan ia tak boleh digantikan pembacaan
 * `REDIS_URL`. Pengukuran dingin mengosongkan basis data logis Redis, dan basis
 * data 0 adalah milik aplikasi pengembangan pengguna: sesinya, singgahannya,
 * penghitung batas lajunya. Mengosongkannya akan mengeluarkan pengguna dari
 * aplikasinya sendiri tanpa ada yang menyebut sebabnya.
 *
 * Diberi jawaban `CLIENT INFO` dari sambungan yang BENAR-BENAR terbuka, bukan
 * nomor yang diurai dari string yang kita susun sendiri -- alasannya sama
 * dengan `pastikanSasaranBeban`: string buatan sendiri selalu terlihat benar.
 */
describe('pastikanRedisBeban', () => {
  const info = (db: number) =>
    `id=14 addr=127.0.0.1:52118 laddr=127.0.0.1:6379 fd=9 name= age=0 idle=0 db=${db} sub=0 psub=0`;

  it('menerima basis data logis 1', () => {
    expect(() => pastikanRedisBeban(info(1))).not.toThrow();
  });

  it('MENOLAK basis data logis 0, milik aplikasi pengembangan', () => {
    expect(() => pastikanRedisBeban(info(0))).toThrow(/basis data logis 0/);
  });

  it('MENOLAK basis data logis 2, milik pelari e2e', () => {
    expect(() => pastikanRedisBeban(info(2))).toThrow(/basis data logis 2/);
  });

  it('MENOLAK jawaban yang tak memuat db= sama sekali', () => {
    expect(() => pastikanRedisBeban('id=14 addr=127.0.0.1:52118 name=')).toThrow(/CLIENT INFO/);
  });

  /**
   * `db=1` yang muncul sebagai bagian nama klien tak boleh dibaca sebagai nomor
   * basis datanya. Tanpa batas kata, `name=db=0` pada jawaban ber-`db=1` akan
   * membuat palangnya menolak sambungan yang benar -- atau, pada urutan
   * sebaliknya, menerima yang salah.
   */
  it('membaca medan db= miliknya sendiri, bukan yang tertanam di medan lain', () => {
    expect(() =>
      pastikanRedisBeban('id=14 name=sesuatu-db=0 addr=127.0.0.1:52118 db=1 sub=0'),
    ).not.toThrow();
  });
});
