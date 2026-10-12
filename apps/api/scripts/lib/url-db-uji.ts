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

/** Nama basis data uji. Satu nama untuk seluruh tim, sengaja tidak dapat diatur. */
export const NAMA_DB_UJI = 'skm_uji';

/**
 * Basis data pemeliharaan tempat `CREATE DATABASE` dijalankan. `CREATE DATABASE`
 * tak dapat dijalankan dari dalam basis data yang hendak dibuat, jadi perlu satu
 * sambungan ke basis data lain yang pasti ada.
 */
const NAMA_DB_PEMELIHARAAN = 'postgres';

const POLA_SKEMA = /^postgres(?:ql)?:\/\//;

export interface SasaranDbUji {
  /** URL lengkap basis data uji, untuk `prisma migrate deploy` dan untuk jest. */
  url: string;
  /** Nama basis data uji, untuk `CREATE DATABASE`. */
  nama: string;
  /** URL ke basis data `postgres`, tempat `CREATE DATABASE` dijalankan. */
  urlPemeliharaan: string;
}

export function sasaranDbUji(urlPengembangan: string): SasaranDbUji {
  if (urlPengembangan.trim() === '') {
    throw new Error('DATABASE_URL tidak diatur; tak ada yang dapat diturunkan darinya.');
  }

  const skema = POLA_SKEMA.exec(urlPengembangan);
  if (skema === null) {
    throw new Error(
      `DATABASE_URL bukan URL Postgres (harus berawalan postgres:// atau postgresql://): ${urlPengembangan}`,
    );
  }

  const batasQuery = urlPengembangan.indexOf('?');
  const sebelumQuery = batasQuery === -1 ? urlPengembangan : urlPengembangan.slice(0, batasQuery);
  const query = batasQuery === -1 ? '' : urlPengembangan.slice(batasQuery);

  const batasNama = sebelumQuery.lastIndexOf('/');
  // Garis miring terakhir milik skema itu sendiri berarti URL-nya tanpa jalur.
  const awalan = sebelumQuery.slice(0, batasNama + 1);
  const nama = batasNama < skema[0].length ? '' : sebelumQuery.slice(batasNama + 1);
  if (nama === '') {
    throw new Error(`DATABASE_URL tanpa nama basis data: ${urlPengembangan}`);
  }

  // Palang keselamatan. Bila basis data pengembangan sudah bernama sama dengan
  // basis data uji, penurunan ini tak memisahkan apa pun dan 40 berkas e2e
  // justru menulis ke basis data yang hendak dilindungi. Lebih baik berhenti.
  if (nama === NAMA_DB_UJI) {
    throw new Error(
      `Basis data pengembangan bernama '${nama}', sama dengan basis data uji. ` +
        'Ganti nama basis data di DATABASE_URL agar uji dan pengembangan terpisah.',
    );
  }

  return {
    url: `${awalan}${NAMA_DB_UJI}${query}`,
    nama: NAMA_DB_UJI,
    urlPemeliharaan: `${awalan}${NAMA_DB_PEMELIHARAAN}${query}`,
  };
}

/** Nama host yang berarti "mesin ini". Tak dapat diatur, sengaja. */
const HOST_LOKAL = new Set(['localhost', '127.0.0.1', '::1']);

/**
 * Menolak URL yang menunjuk ke server selain mesin pengembang.
 *
 * Pelari uji MEMBUAT basis data lalu menulis baris sungguhan ke dalamnya. Satu
 * salah ketik pada `DATABASE_URL` -- atau satu `.env` yang tertukar -- sudah
 * cukup untuk melakukan keduanya pada server produksi, dan itu tak dapat
 * dibatalkan. Aturan tetap proyek sudah melarangnya; palang ini yang menahannya
 * ketika aturan terlewat.
 *
 * Hostnya dibaca sesudah pemisah kredensial TERAKHIR. Sandi yang memuat `@`
 * dalam bentuk persentase membuat pengurai yang membaca `@` pertama mengira
 * potongan sandi adalah nama host, dan URL produksi lolos tanpa suara.
 */
export function pastikanHostLokal(url: string): void {
  const host = hostDari(url);
  if (!HOST_LOKAL.has(host)) {
    throw new Error(
      `DATABASE_URL menunjuk host '${host}', bukan mesin ini. Pelari uji membuat ` +
        'basis data dan menulis baris ke dalamnya, jadi ia menolak jalan terhadap ' +
        'server mana pun selain localhost. Arahkan DATABASE_URL ke Postgres di ' +
        'docker compose milik Anda.',
    );
  }
}

function hostDari(url: string): string {
  const tanpaSkema = url.replace(POLA_SKEMA, '');
  const batasJalur = tanpaSkema.search(/[/?]/);
  const otoritas = batasJalur === -1 ? tanpaSkema : tanpaSkema.slice(0, batasJalur);
  const batasKredensial = otoritas.lastIndexOf('@');
  const hostPorta = batasKredensial === -1 ? otoritas : otoritas.slice(batasKredensial + 1);

  if (hostPorta.startsWith('[')) {
    const tutup = hostPorta.indexOf(']');
    return tutup === -1 ? hostPorta : hostPorta.slice(1, tutup);
  }

  const batasPorta = hostPorta.lastIndexOf(':');
  if (batasPorta !== -1 && /^\d+$/.test(hostPorta.slice(batasPorta + 1))) {
    return hostPorta.slice(0, batasPorta);
  }
  return hostPorta;
}
