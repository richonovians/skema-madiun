/**
 * Alamat dasar API — SATU definisi, dipakai dua pemakai yang tak boleh saling
 * mengimpor.
 *
 * `api.js` (axios) mengimpor `clearSession` dari `authStorage.js`, jadi
 * `authStorage.js` TIDAK BOLEH mengimpor `api.js` — itu impor berputar, dan
 * komentar di kepala `api.js` memang menyandarkan diri pada kenyataan bahwa
 * authStorage tak mengimpor apa pun.
 *
 * Sejak `clearSession()` perlu memanggil `POST /auth/logout` sendiri (perbaikan
 * sesi hantu, 8 September 2026), keduanya butuh alamat yang sama. Menyalin
 * literalnya ke dua tempat berarti dua nilai yang cepat atau lambat berbeda —
 * dan yang berbeda diam-diam adalah alamat backend, gejalanya "logout tak
 * berpengaruh" tanpa satu pun galat.
 *
 * Berkas ini sengaja TIDAK mengimpor apa pun.
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
