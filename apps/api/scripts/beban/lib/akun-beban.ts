/**
 * AKUN YANG DIPAKAI PELARI BEBAN.
 *
 * Berkas sekecil ini ada karena satu cacat terukur. Nilai di bawah sebelumnya
 * diekspor dari `siapkan-data.ts`, dan `jalankan.ts` mengimpornya dari sana --
 * padahal `siapkan-data.ts` memanggil `void utama()` di aras modul. Jadi SETIAP
 * jalan uji beban ikut menjalankan pembangun dataset: tiga jalan menghasilkan
 * 2.232 survei (tiga kali 744) dengan 60 respons per survei padahal diminta 20,
 * dan satu set angka sempat diukur di atasnya (13 Oktober 2026).
 *
 * Gejalanya tidak menunjuk ke sebabnya sama sekali. Yang terlihat hanyalah
 * dataset yang "tumbuh sendiri" di antara dua pembacaan, sementara hanya beban
 * BACA yang berjalan.
 *
 * Konstanta di modul tanpa efek samping adalah penahannya; `require.main`
 * di kedua skrip adalah penahan keduanya.
 */

/** Identitas `dev-login` untuk pelari beban. */
export const IDENTITAS_ADMIN = 'beban-admin-kabupaten';

/**
 * Tiga peran pada satu akun. `@Roles` tak mengenal lintas peran:
 * `GET /surveys/:id/fill` menjawab 403 bagi sesi `kabupaten`, dan
 * `GET /dashboard/opd` menolak siapa pun selain `opd`.
 *
 * `opd` ditambahkan 4 November 2026 untuk skenario `dashboard-opd`. Peran itu
 * menuntut `opd_id` terisi -- tanpa itu gerbangnya menolak sesi `opd` -- jadi
 * `bangunPengguna` di `siapkan-data.ts` menautkan akun ini ke `OPD_BEBAN`.
 */
export const PERAN_BEBAN = ['kabupaten', 'responden', 'opd'] as const;

/**
 * OPD tempat akun beban bertindak sebagai Admin OPD. Setiap OPD beban memegang
 * jumlah survei yang sama (survei dibagi rata ke 62 OPD), jadi pilihannya tak
 * menggeser angka; yang pertama dipakai supaya selalu ada.
 */
export const OPD_BEBAN = 'BEBAN0001';

export type PeranBeban = (typeof PERAN_BEBAN)[number];

/**
 * AKUN RESPONDEN BEBAN untuk skenario `kirim-jawaban` (§11.3).
 *
 * `POST /surveys/:id/responses` ber-`@Throttle` 10/menit PER PENGGUNA, dan
 * batas itu tertulis di dekoratornya, tak ikut dilonggarkan `THROTTLE_LIMIT`.
 * Satu sesi yang dipukul autocannon karena itu mengukur 429, bukan aplikasinya.
 * Seratus akun memberi 1.000 permintaan dalam semenit tanpa satu pun menyentuh
 * batasnya.
 */
export const JUMLAH_RESPONDEN_BEBAN = 100;

export function identitasResponden(nomor: number): string {
  return `beban-responden-${String(nomor).padStart(3, '0')}`;
}

/**
 * Akun TERSENDIRI untuk `batas-harian-serentak`. Bukan akun admin beban: akun
 * itu sudah menulis ribuan pengaduan hari ini lewat `kirim-pengaduan`, sehingga
 * batas hariannya sudah lewat sebelum balapan dimulai dan semua 50 permintaan
 * dijawab 429 -- "nol diterima" yang terbaca seperti penahan bekerja sempurna.
 */
export const IDENTITAS_BATAS_HARIAN = 'beban-batas-harian';
