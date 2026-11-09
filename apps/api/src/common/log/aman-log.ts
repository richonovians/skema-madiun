/**
 * Penetral teks dari luar sebelum ia masuk log aplikasi.
 *
 * Temuan audit `sso-callback-error-log-forging` (9 November 2026). Logger
 * bawaan Nest (`ConsoleLogger`, mode teks) menulis pesan apa adanya ke stdout.
 * `GET /auth/sso/callback` bersifat `@Public` dan mencatat `error` serta
 * `error_description` dari query, sehingga LF di dalamnya memulai baris log
 * baru yang dapat meniru catatan `[Nest] ... LOG [SsoService]` asli, dan ESC
 * menyisipkan urutan kendali ke terminal operator. Terukur dengan
 * `process.stdout.write` hari itu juga.
 *
 * DINETRALKAN, BUKAN DIBUANG. Baris log itu tempat operator membaca keterangan
 * galat asli dari Helpdesk (docblock `sso-galat.util.ts`), jadi isinya harus
 * tetap terbaca. Setiap karakter berbahaya ditulis ulang sebagai `\uXXXX`
 * yang terlihat:
 *
 * - kendali C0, DEL, dan C1 (`\p{Cc}`) -- termasuk CR, LF, TAB, dan ESC;
 * - U+2028/U+2029, yang dibaca sebagai baris baru oleh sebagian penampil log;
 * - kendali arah teks (U+061C, U+200E/F, U+202A-202E, U+2066-2069), yang
 *   dapat membalik urutan tampilan sebuah baris tanpa mengubah isinya.
 *
 * Garis miring terbalik DIGANDAKAN dan tanda kutip ganda di-escape. Tanpa yang
 * pertama, masukan berisi teks `\u000a` tak terbedakan dari LF yang
 * dinetralkan; tanpa yang kedua, pemanggil yang membungkus nilainya dengan
 * kutip (`error="..."`) dapat ditutup dari dalam nilai itu sendiri.
 *
 * Bukan pengganti `MaxLength` di DTO: fungsi ini tidak memendekkan apa pun.
 */
const KARAKTER_BERBAHAYA = /[\\"\p{Cc}\u061c\u200e\u200f\u2028\u2029\u202a-\u202e\u2066-\u2069]/gu;

export function amankanLog(nilai: string): string {
  return nilai.replace(KARAKTER_BERBAHAYA, (c) => {
    if (c === '\\') return '\\\\';
    if (c === '"') return '\\"';
    return `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`;
  });
}
