/**
 * SASARAN UJI BEBAN, dan dua palang yang menjaganya.
 *
 * MENGAPA BASIS DATA KETIGA. `skm_db` memuat data pengembangan pengguna, dan
 * `skm_uji` dibuang lalu di-seed ulang setiap kali `test:e2e` jalan. Dataset
 * beban berisi jutaan baris, mahal dibangun, dan harus bertahan di antara
 * pengukuran -- jadi ia tak dapat menumpang keduanya.
 *
 * MENGAPA DUA PALANG, bukan satu. Yang pertama memeriksa TEKS URL-nya; yang
 * kedua memeriksa SAMBUNGAN yang benar-benar terbuka. Keduanya menjawab
 * pertanyaan berbeda, dan yang kedua tak dapat digantikan yang pertama: string
 * yang disusun sendiri selalu terlihat benar.
 */
import { gantiNamaBasisData, pastikanHostLokal, pecahUrlPostgres } from '../../lib/url-postgres';

/** Nama basis data uji beban. Sengaja tidak dapat diatur dari luar. */
export const NAMA_DB_BEBAN = 'skm_beban';

/**
 * Menurunkan URL basis data beban dari `DATABASE_URL` milik pengembang, dengan
 * menukar NAMA basis datanya saja. Idempoten: URL yang sudah menunjuk
 * `skm_beban` keluar sama persis.
 *
 * Host bukan-lokal ditolak di sini, bukan di pemanggilnya, supaya tak ada jalur
 * pemakaian yang dapat melewatkannya. Pembangun dataset menulis jutaan baris,
 * dan pada server yang salah itu tak dapat dibatalkan.
 */
export function sasaranDbBeban(urlPengembangan: string): string {
  pastikanHostLokal(urlPengembangan);
  const { nama } = pecahUrlPostgres(urlPengembangan);
  return nama === NAMA_DB_BEBAN
    ? urlPengembangan
    : gantiNamaBasisData(urlPengembangan, NAMA_DB_BEBAN);
}

/**
 * Menolak menulis bila basis data yang BENAR-BENAR tersambung bukan `skm_beban`.
 *
 * Dipanggil dengan jawaban `SELECT current_database()`, bukan dengan nama yang
 * diurai dari string. Inilah satu-satunya palang yang menahan salah sambung
 * sungguhan: `.env` yang tertukar, variabel lingkungan yang menang atas dugaan,
 * atau URL benar yang ternyata menunjuk server lain. Yang paling mahal bila
 * lolos adalah `skm_db` -- jutaan baris uji beban di sana tak dapat dibersihkan
 * oleh skrip mana pun yang dimiliki proyek ini.
 */
export function pastikanSasaranBeban(namaTersambung: string): void {
  if (namaTersambung !== NAMA_DB_BEBAN) {
    throw new Error(
      `Tersambung ke basis data '${namaTersambung}', bukan '${NAMA_DB_BEBAN}'. ` +
        'Pembangun dataset beban menulis jutaan baris dan menolak jalan di luar ' +
        `'${NAMA_DB_BEBAN}'.`,
    );
  }
}

/** Nomor basis data logis Redis untuk uji beban. Dev memakai 0, yaitu bawaannya. */
const DB_REDIS_BEBAN = 1;

/**
 * Mengarahkan `REDIS_URL` ke basis data logis tersendiri, supaya jalan beban tak
 * bercampur dengan Redis yang dipakai aplikasi dev.
 *
 * TERUKUR, bukan dijaga-jaga. Jalan beban pertama (13 Oktober 2026) menulis
 * `singgahan:ikm-hasil:6` ke Redis yang sama dengan yang dibaca aplikasi dev.
 * Survei id 6 ada di `skm_db` maupun `skm_beban` dengan isi berbeda, jadi angka
 * IKM di layar sempat berasal dari dataset beban. Ia pulih sendiri dalam 60
 * detik karena TTL singgahan, tetapi akan terulang setiap jalan.
 *
 * Kunci singgahan tak membawa pembeda basis data, dan itu bukan yang diperbaiki
 * di sini. Satu angka di ujung URL memisahkan SELURUH ruang kuncinya --
 * singgahan, penghitung batas laju, sesi, dan daftar pencabutan lampiran -- dan
 * tak menuntut satu baris pun perubahan di kode aplikasi, karena keempat klien
 * memakai `new Redis(url)` dari ioredis yang menghormati jalur sebagai nomor
 * basis data.
 */
export function redisBeban(url: string): string {
  if (url.trim() === '') {
    throw new Error(
      'REDIS_URL tidak diatur. Tanpa itu aplikasi memakai penyimpan singgahan ' +
        'NONAKTIF dan batas laju dalam memori, sehingga yang terukur adalah sistem ' +
        'yang berbeda dari yang digelar.',
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
  return `${cocok[1]}/${DB_REDIS_BEBAN}`;
}
