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
