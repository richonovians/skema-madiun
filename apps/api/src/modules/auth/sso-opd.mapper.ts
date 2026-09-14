/**
 * OPD dari klaim Helpdesk — penguraian & normalisasi.
 *
 * PERMINTAAN PENGGUNA 8 September 2026: "ketika sedang login request di
 * helpdesk, nantinya dari helpdesk akan mengirim userinfo yang berisi data
 * usernya, pada data user tersebut jika pengguna seorang ASN akan ada data nama
 * opdnya, dan dari data user/ASN tersebut akan menentukan dinas user tersebut di
 * sebuah opd."
 *
 * BENTUK KLAIMNYA BELUM DIKETAHUI, dan pengguna belum memiliki contoh payload.
 * Berkas ini karena itu dirancang untuk TIDAK MENEBAK:
 *
 *  1. Nama field-nya dikonfigurasi lewat `HELPDESK_SSO_OPD_CLAIM`, pola yang
 *     sama dengan `HELPDESK_SSO_ROLE_MAP` yang sudah ada. Tak ada nama field
 *     yang dipaku di kode.
 *  2. Nilainya diambil dari tiga bentuk sekaligus (teks, array, objek
 *     ber-`nama`/`kode`), sehingga bentuk apa pun yang datang tertangani.
 *  3. Pencocokannya di `SsoService` dibuat bertingkat: `externalId` -> `kode`
 *     -> `nama` yang dinormalkan, dan yang terakhir menuntut TEPAT SATU
 *     kecocokan. Pencocokan yang mendua ditolak, tidak diterka.
 *
 * FUNGSI MURNI, sengaja tanpa Nest dan tanpa Prisma — alasannya sama seperti
 * `acting-role.util.ts`: ini titik tempat kesalahan berakibat seseorang tertaut
 * ke instansi yang bukan tempatnya, dan uji semahal "butuh Prisma + JWT"
 * cenderung tak pernah ditulis lengkap.
 */

/**
 * Nama field yang diperiksa bila `HELPDESK_SSO_OPD_CLAIM` tak diisi.
 *
 * Baku yang masuk akal, bukan tebakan yang dipaksakan: kalau ternyata Helpdesk
 * memakai salah satu nama lazim ini, fiturnya jalan tanpa konfigurasi; kalau
 * tidak, log penemuan di `SsoService` akan menyebutkan nama-nama field yang
 * BENAR-BENAR diterima, dan env-nya cukup diisi sekali.
 */
const FIELD_BAKU = ['opd', 'satker', 'instansi', 'unit_kerja', 'unitKerja', 'organization'];

/** Kunci yang dibaca bila nilai klaimnya berupa objek. */
const KUNCI_OBJEK = ['nama', 'name', 'kode', 'code', 'id'];

/**
 * Nama field klaim yang membawa OPD.
 * @param raw isi `HELPDESK_SSO_OPD_CLAIM`, dipisah koma
 */
export function parseOpdClaimFields(raw: string | undefined): string[] {
  const dari = (raw ?? '')
    .split(',')
    .map((bagian) => bagian.trim())
    .filter(Boolean);
  return [...new Set(dari.length > 0 ? dari : FIELD_BAKU)];
}

/**
 * Nilai kandidat OPD dari klaim mentah.
 *
 * HANYA field yang dikonfigurasi yang dibaca, dan itu bukan kehati-hatian
 * berlebihan: membaca seluruh klaim berarti `nama` pengguna ikut dianggap
 * kandidat, sehingga seorang bernama sama dengan sebuah OPD dapat tertaut ke
 * instansi itu.
 *
 * Nilainya dikembalikan APA ADANYA (belum dinormalkan) supaya pemanggil dapat
 * mencocokkannya ke `externalId`/`kode` yang peka bentuk, lalu ke `nama` yang
 * dinormalkan.
 */
export function extractOpdClaimValues(
  klaim: Record<string, unknown> | undefined,
  fields: string[],
): string[] {
  if (!klaim) {
    return [];
  }
  const keluar: string[] = [];
  const tambah = (nilai: unknown): void => {
    if (typeof nilai !== 'string') {
      return;
    }
    const bersih = nilai.trim();
    // Elemen TIDAK dipecah per spasi — beda dengan penguraian klaim role. Nama
    // OPD memuat spasi ("Dinas Kesehatan"), jadi memecahnya menghasilkan
    // potongan yang tak pernah cocok dengan apa pun.
    if (bersih && !keluar.includes(bersih)) {
      keluar.push(bersih);
    }
  };

  for (const field of fields) {
    const nilai = klaim[field];
    if (Array.isArray(nilai)) {
      nilai.forEach(tambah);
    } else if (nilai !== null && typeof nilai === 'object') {
      for (const kunci of KUNCI_OBJEK) {
        tambah((nilai as Record<string, unknown>)[kunci]);
      }
    } else {
      tambah(nilai);
    }
  }
  return keluar;
}

/**
 * Bentuk baku sebuah nama OPD untuk dibandingkan.
 *
 * Huruf kecil, tanda baca dibuang, spasi dirapatkan — cukup untuk memaafkan
 * beda kapital, titik, dan spasi ganda. TIDAK lebih jauh dari itu: memangkas
 * kata atau mencocokkan sebagian akan menyamakan "Dinas Kesehatan" dengan
 * "Dinas Kesehatan dan Keluarga Berencana", dua instansi yang berbeda.
 */
export function normalkanNamaOpd(nama: string): string {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
