/**
 * Satu tempat yang tahu nama variabel site key Turnstile (14 September 2026).
 *
 * Dua berkas membutuhkannya dengan alasan berbeda: TurnstileWidget untuk
 * memasang widgetnya, ModalKirimSurvei untuk memutuskan apakah tombol kirim
 * boleh dikunci. Menyebar nama variabelnya ke dua tempat membuat salah satunya
 * ketinggalan saat namanya berubah, dan gejalanya adalah tombol kirim yang mati
 * selamanya tanpa satu pun pesan galat.
 */
export function siteKeyCaptcha() {
  return process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '';
}

/**
 * `false` berarti captcha memang tidak dipasang di lingkungan ini, bukan bahwa
 * verifikasinya belum selesai. Backend pun mematikan verifikasinya ketika
 * rahasianya kosong, jadi keduanya mati bersamaan.
 */
export function captchaTersedia() {
  return siteKeyCaptcha() !== '';
}
