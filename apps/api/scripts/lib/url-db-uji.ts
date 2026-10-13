/**
 * PENURUNAN URL BASIS DATA UJI
 *
 * Suite e2e `apps/api` menulis baris sungguhan, dan sampai sekarang ia menulis
 * ke `skm_db` -- basis data pengembangan yang sama yang dipakai aplikasi saat
 * `pnpm dev`. Akibatnya terukur, bukan dikira: lihat `test/opd.e2e-spec.ts`,
 * yang menyimpan lalu memulihkan seluruh daftar OPD hanya karena satu kali
 * jalan pernah menonaktifkan 53 OPD hasil sinkronisasi sungguhan.
 *
 * URL basis data uji DITURUNKAN dari `DATABASE_URL` milik tiap pengembang,
 * bukan dibaca dari entri `.env` tersendiri. Itu keputusan sengaja: tak seorang
 * pun di tim perlu menyunting `.env` mereka, `.env.example` tak berubah, dan
 * sandi siapa pun tetap terpakai apa adanya. Satu-satunya yang berganti adalah
 * nama basis datanya.
 *
 * Penurunannya memakai BEDAH TEKS, bukan `new URL()`. `new URL()` menormalkan
 * ulang bagian kredensial, sehingga sandi berisi karakter berpersentase dapat
 * keluar berbeda dari yang masuk; gejalanya adalah "password authentication
 * failed" yang menunjuk ke arah yang salah sama sekali. Dengan bedah teks,
 * setiap byte di luar nama basis data keluar persis seperti masuknya.
 *
 * Batas yang disadari: sandi yang memuat `?` atau `/` secara MENTAH akan salah
 * diurai di sini. Bentuk itu juga sudah salah menurut spesifikasi URL Postgres
 * dan harus dipersentasekan; tak ada penanganan khusus yang ditambahkan untuk
 * bentuk yang memang tak sah.
 */

import { gantiNamaBasisData, pecahUrlPostgres } from './url-postgres';

// Diteruskan, bukan didefinisikan di sini: palang host milik `url-postgres.ts`
// sejak 13 Oktober 2026, dan pelari uji beban memakainya juga. Penerusan ini
// menjaga `uji-e2e.ts` dan specnya tak perlu berubah.
export { pastikanHostLokal } from './url-postgres';

/** Nama basis data uji. Satu nama untuk seluruh tim, sengaja tidak dapat diatur. */
export const NAMA_DB_UJI = 'skm_uji';

export interface SasaranDbUji {
  /** URL lengkap basis data uji, untuk `prisma migrate deploy` dan untuk jest. */
  url: string;
  /** Nama basis data uji, untuk dicetak ke layar. */
  nama: string;
  /**
   * `true` bila `DATABASE_URL` SUDAH menunjuk basis data uji, sehingga tak ada
   * yang perlu diturunkan maupun dibuat. Itu keadaan normal di CI.
   */
  sudahTerpisah: boolean;
}

export function sasaranDbUji(urlPengembangan: string): SasaranDbUji {
  const { nama } = pecahUrlPostgres(urlPengembangan);

  // SUDAH TERPISAH, dan itu BUKAN kesalahan konfigurasi.
  //
  // `.github/workflows/ci.yml` menyalakan layanan Postgres ber-`POSTGRES_DB:
  // skm_uji` dan mengarahkan `DATABASE_URL` ke sana, jauh sebelum pelari ini
  // ada. Versi pertama melempar galat di titik ini dan mematikan job "E2E API"
  // pada dorongan pertama (`aae9b1e`), sebelum satu uji pun jalan.
  //
  // Lemparan itu tak melindungi apa pun. Yang hendak dicegah adalah menulis ke
  // basis data PENGEMBANGAN; bila `DATABASE_URL` sudah menunjuk basis data uji,
  // justru itulah keadaan yang diinginkan. Jadi URL-nya dipakai apa adanya, dan
  // `sudahTerpisah` memberi tahu pemanggil bahwa basis datanya pasti ada.
  if (nama === NAMA_DB_UJI) {
    return { sudahTerpisah: true, url: urlPengembangan, nama };
  }

  return {
    sudahTerpisah: false,
    url: gantiNamaBasisData(urlPengembangan, NAMA_DB_UJI),
    nama: NAMA_DB_UJI,
  };
}
