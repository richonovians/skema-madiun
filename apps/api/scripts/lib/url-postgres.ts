/**
 * BEDAH TEKS URL POSTGRES, dipakai bersama.
 *
 * Dipisah dari `url-db-uji.ts` pada 13 Oktober 2026 karena pelari uji beban
 * menuntut penurunan yang sama persis untuk basis data yang berbeda. Menyalin
 * dua puluh baris ini ke sana berarti dua tempat yang dapat menyimpang, dan
 * seluk-beluknya tidak kelihatan dari permukaan: lihat alasan mengapa
 * `new URL()` tak dipakai.
 *
 * `new URL()` menormalkan ulang bagian kredensial, sehingga sandi berisi
 * karakter berpersentase dapat keluar berbeda dari yang masuk; gejalanya
 * "password authentication failed" yang menunjuk arah salah sama sekali. Dengan
 * bedah teks, setiap byte di luar nama basis data keluar persis seperti
 * masuknya.
 *
 * Batas yang disadari: sandi yang memuat `?` atau `/` secara MENTAH akan salah
 * diurai di sini. Bentuk itu juga sudah salah menurut spesifikasi URL Postgres
 * dan harus dipersentasekan; tak ada penanganan khusus untuk bentuk tak sah.
 */

export const POLA_SKEMA = /^postgres(?:ql)?:\/\//;

export interface BagianUrlPostgres {
  /** Segalanya sampai dan termasuk garis miring terakhir sebelum nama basis data. */
  awalan: string;
  /** Nama basis data yang sekarang tertulis di URL. */
  nama: string;
  /** `?...` apa adanya, atau string kosong bila tak ada. */
  query: string;
}

export function pecahUrlPostgres(url: string): BagianUrlPostgres {
  if (url.trim() === '') {
    throw new Error('DATABASE_URL tidak diatur; tak ada yang dapat diturunkan darinya.');
  }

  const skema = POLA_SKEMA.exec(url);
  if (skema === null) {
    throw new Error(
      `DATABASE_URL bukan URL Postgres (harus berawalan postgres:// atau postgresql://): ${url}`,
    );
  }

  const batasQuery = url.indexOf('?');
  const sebelumQuery = batasQuery === -1 ? url : url.slice(0, batasQuery);
  const query = batasQuery === -1 ? '' : url.slice(batasQuery);

  const batasNama = sebelumQuery.lastIndexOf('/');
  // Garis miring terakhir milik skema itu sendiri berarti URL-nya tanpa jalur.
  const awalan = sebelumQuery.slice(0, batasNama + 1);
  const nama = batasNama < skema[0].length ? '' : sebelumQuery.slice(batasNama + 1);
  if (nama === '') {
    throw new Error(`DATABASE_URL tanpa nama basis data: ${url}`);
  }

  return { awalan, nama, query };
}

/** Menukar nama basis data pada URL, tanpa menyentuh byte lain. */
export function gantiNamaBasisData(url: string, namaBaru: string): string {
  const { awalan, query } = pecahUrlPostgres(url);
  return `${awalan}${namaBaru}${query}`;
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
