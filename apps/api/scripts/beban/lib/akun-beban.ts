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
 * Dua peran pada satu akun. `@Roles` tak mengenal lintas peran:
 * `GET /surveys/:id/fill` menjawab 403 bagi sesi `kabupaten`.
 */
export const PERAN_BEBAN = ['kabupaten', 'responden'] as const;

export type PeranBeban = (typeof PERAN_BEBAN)[number];
