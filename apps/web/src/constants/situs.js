/**
 * Alamat kanonis situs, dipakai `metadataBase`, sitemap, dan robots.txt.
 *
 * Nilai jatuhnya diambil dari `apps/api/.env.example`, yang sudah menyebut
 * `https://skema.madiunkab.go.id` sebagai domain produksi pada konfigurasi SSO.
 * Jadi ini bukan tebakan: ia alamat yang sama yang harus didaftarkan ke
 * Helpdesk agar alur masuk bekerja.
 *
 * Dapat ditimpa lewat `NEXT_PUBLIC_SITE_URL` untuk lingkungan uji coba, supaya
 * sitemap di sana tidak mengumumkan alamat produksi.
 */
export const ALAMAT_SITUS = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://skema.madiunkab.go.id';

/**
 * Satu-satunya daftar halaman yang boleh dirayapi dan ditayangkan mesin
 * pencari. Dipakai robots.txt DAN sitemap, sengaja dari sumber yang sama:
 * kalau keduanya punya daftar sendiri-sendiri, cepat atau lambat keduanya
 * berselisih, dan yang bocor adalah sitemap.
 */
export const HALAMAN_PUBLIK = ['/', '/about', '/statistics', '/kebijakan-privasi'];
