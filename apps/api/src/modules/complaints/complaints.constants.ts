/**
 * Berapa pengaduan yang boleh dikirim satu akun dalam satu hari kalender
 * (14 September 2026, keputusan pengguna). BAKU -- dapat ditimpa lewat
 * COMPLAINT_DAILY_LIMIT, sebab angkanya kebijakan dan bukan tetapan teknis.
 *
 * Angkanya dipilih longgar dengan sengaja. Warga yang melaporkan beberapa titik
 * sekaligus -- beberapa lampu jalan di satu ruas, misalnya -- tak boleh
 * tertahan, sedangkan bot mencapai sepuluh dalam hitungan detik. Batas yang
 * menghukum pelapor tekun demi menahan bot adalah pertukaran yang buruk:
 * pengaduan yang tak jadi dikirim tak pernah terlihat oleh siapa pun.
 */
export const BATAS_HARIAN_PENGADUAN_BAKU = 10;

/** Kode penolakan yang dibaca frontend untuk membedakannya dari 429 batas laju. */
export const BATAS_HARIAN_TERCAPAI = 'BATAS_HARIAN_PENGADUAN';
