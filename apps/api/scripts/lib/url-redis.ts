/**
 * MENUKAR NOMOR BASIS DATA LOGIS pada `REDIS_URL`.
 *
 * MENGAPA PERLU, dan ini terukur dua kali. Kunci singgahan aplikasi ini tak
 * membawa penanda basis data -- `singgahan:ikm-hasil:<id>`,
 * `singgahan:ikm-dashboard:...`, `statistik-publik` -- sehingga dua proses yang
 * menunjuk basis data Postgres BERBEDA tetap berbagi satu ruang kunci Redis:
 *
 *   1. 13 Oktober 2026, pelari uji beban terhadap `skm_beban` mencemari angka
 *      IKM yang disinggahkan aplikasi dev terhadap `skm_db`.
 *   2. Hari yang sama, e2e terhadap `skm_uji` memerah karena tiga berkas spec
 *      berbagi satu kunci dashboard ber-TTL 60 detik -- dan berbagi juga dengan
 *      aplikasi dev. Hasil e2e karena itu bergantung pada apa pun yang
 *      menyentuh Redis dalam enam puluh detik terakhir.
 *
 * Satu angka di ujung URL memisahkan SELURUH ruang kuncinya -- singgahan,
 * penghitung batas laju, sesi, daftar pencabutan lampiran -- dan tak menuntut
 * satu baris pun perubahan di kode aplikasi, karena keempat kliennya memakai
 * `new Redis(url)` dari ioredis yang menghormati jalur sebagai nomor basis
 * data.
 *
 * Yang TIDAK diperbaiki di sini: kunci tanpa penanda basis data itu sendiri.
 * Memperbaikinya menuntut perubahan di kode aplikasi dan tak diperlukan selama
 * setiap pelari memakai nomornya sendiri.
 */

/** Nomor basis data logis yang sudah dipakai. Pengembangan memakai 0, bawaannya. */
export const DB_REDIS_BEBAN = 1;
export const DB_REDIS_UJI = 2;

export function redisDbLogis(url: string, db: number): string {
  if (!Number.isInteger(db) || db < 0) {
    throw new Error(`Nomor basis data Redis harus bilangan bulat tak negatif, bukan ${db}`);
  }
  if (url.trim() === '') {
    throw new Error(
      'REDIS_URL tidak diatur. Tanpa itu aplikasi memakai penyimpan singgahan ' +
        'NONAKTIF dan batas laju dalam memori, sehingga yang dijalankan adalah ' +
        'sistem yang berbeda dari yang digelar.',
    );
  }
  // Dipotong pada garis miring pertama SESUDAH skema, bukan pada yang terakhir.
  // Versi pertama memakai `/[^/]*$/` dan memakan otoritasnya sendiri ketika
  // URL-nya tanpa jalur, karena garis miring terakhir di `redis://host:6379`
  // justru milik `//` pada skemanya -- hasilnya `redis:/1`. Terukur, merah.
  const cocok = /^([a-z][a-z0-9+.-]*:\/\/[^/]*)/i.exec(url.trim());
  if (cocok === null) {
    throw new Error(`REDIS_URL bukan URL yang dapat diurai: ${url}`);
  }
  return `${cocok[1]}/${db}`;
}

/**
 * Seperti `redisDbLogis`, tetapi `undefined` ketika `REDIS_URL` memang tak ada.
 *
 * MENGAPA PERLU CABANG INI. CI tak punya Redis sama sekali: job
 * "E2E API (PostgreSQL sungguhan)" di `.github/workflows/ci.yml` hanya
 * menyediakan layanan `postgres` dan tak menyetel `REDIS_URL`. Memakai
 * `redisDbLogis` apa adanya di pelari e2e akan MELEMPAR di CI dan mematikan
 * job-nya -- bentuk kegagalan yang sama persis dengan 12 Oktober 2026, ketika
 * penjaga basis data uji menolak `DATABASE_URL` milik CI karena saya tak
 * membaca berkas workflow-nya lebih dulu.
 *
 * `undefined` berarti "jangan setel apa pun", sehingga aplikasi memakai
 * penyimpan singgahan NONAKTIF -- persis perilaku CI hari ini, dan sah untuk
 * e2e karena singgahan yang selalu meleset tak pernah menyajikan angka basi.
 *
 * URL yang TERISI tetapi tak dapat diurai tetap melempar: itu kekeliruan
 * konfigurasi, bukan ketiadaan.
 */
export function redisDbLogisBilaAda(url: string | undefined, db: number): string | undefined {
  if (url === undefined || url.trim() === '') {
    return undefined;
  }
  return redisDbLogis(url, db);
}
