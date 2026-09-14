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

/**
 * Batas ukuran satu lampiran, dipakai BERSAMA oleh multer (controller) dan
 * pemeriksaan bisnis (service) -- 14 September 2026.
 *
 * SEBELUMNYA langit-langit multer 20MB, empat kali batas ini. Longgarnya
 * disengaja waktu itu: multer memakai `memoryStorage()`, jadi penolakannya
 * terjadi setelah berkas dibaca utuh, dan galatnya mentah. Dengan langit-langit
 * tinggi, berkas 6MB sampai ke service dan mendapat 400 yang jelas.
 *
 * Ongkosnya terlalu mahal: lima berkas 20MB berarti seratus megabyte ditahan di
 * memori hanya untuk ditolak sesaat kemudian, dan akun biasa sudah cukup untuk
 * mengulanginya. Karena itu langit-langitnya kini menyamai batas bisnis, dan
 * penolakan multer DIPETAKAN di AllExceptionsFilter supaya pesannya tetap
 * menyebut batasnya.
 */
export const BATAS_UKURAN_LAMPIRAN_BYTES = 5 * 1024 * 1024;

/** Dipakai pesan penolakan di dua tempat; satu sumber supaya tak berbeda. */
export const BATAS_UKURAN_LAMPIRAN_LABEL = '5MB';
