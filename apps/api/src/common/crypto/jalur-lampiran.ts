import * as path from 'node:path';

/**
 * Resolusi jalur berkas lampiran, dengan penegakan batas direktori
 * (23 September 2026).
 *
 * MENGAPA INI TIBA-TIBA PERLU ADA. Sampai hari ini `/uploads/*` disajikan
 * `express.static`, dan penegakan batas direktori itu pekerjaan yang ia lakukan
 * untuk kita tanpa diminta. Sejak berkasnya terenkripsi, penyajiannya harus
 * ditangani sendiri -- dan seluruh perlindungan yang tadinya gratis kini harus
 * ditulis. Ini salah satu yang paling mudah terlupakan justru karena ia dulu
 * tak pernah terlihat.
 *
 * TANDA TANGAN URL SUDAH MENUTUP LUBANG INI, dan itu bukan alasan untuk tidak
 * menulisnya. `verifyAttachmentPath` menandatangani jalur secara persis, jadi
 * `/uploads/../../.env` takkan pernah punya tanda tangan sah. Tetapi lapisan
 * yang membaca berkas dari disk tidak boleh menyandarkan keselamatannya pada
 * lapisan lain yang kebetulan berjalan lebih dulu: urutan middleware adalah hal
 * yang dapat berubah dalam satu baris suntingan, dan perubahan itu takkan
 * bergejala sampai ada yang mencobanya.
 *
 * PENYANDIAN PERSEN DIBONGKAR LEBIH DULU. `%2e%2e` adalah `..` bagi sistem
 * berkas tetapi bukan bagi pembandingan teks; memeriksa jalur yang belum
 * dibongkar berarti memeriksa hal yang salah.
 */
const TIPE: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.pdf': 'application/pdf',
};

const PREFIKS = '/uploads/';

/**
 * Peta EMPAT tipe, bukan basis data MIME lengkap milik `express.static`.
 *
 * Ekstensinya sendiri sudah diturunkan dari MIME yang divalidasi ISINYA saat
 * unggah (lihat attachment.util.ts), jadi ia tepercaya. Peta sesempit ini lebih
 * ketat daripada yang digantikannya: apa pun di luar keempatnya disajikan
 * sebagai unduhan biner, bukan ditebak lalu dieksekusi peramban.
 */
export function tipeKonten(namaBerkas: string): string {
  return TIPE[path.extname(namaBerkas).toLowerCase()] ?? 'application/octet-stream';
}

/** `null` berarti tolak. Pemanggil menjawab 403/404, tak pernah membaca disk. */
export function resolveLampiran(uploadDir: string, urlPath: string): string | null {
  if (!urlPath.startsWith(PREFIKS)) {
    return null;
  }

  let relatif: string;
  try {
    relatif = decodeURIComponent(urlPath.slice(PREFIKS.length));
  } catch {
    // Penyandian cacat (`%zz`) membuat decodeURIComponent melempar. Yang benar
    // di sini menolak, bukan meledak ke penangan galat global.
    return null;
  }

  // Byte nol dapat memotong jalur di lapisan yang lebih bawah, sehingga
  // `foto.png\0.txt` terbaca sebagai `foto.png`. Node sendiri menolaknya, tapi
  // menolak di sini berarti jawabannya 404 yang tenang, bukan galat.
  if (relatif.includes('\0')) {
    return null;
  }

  const akar = path.resolve(uploadDir);
  const penuh = path.resolve(akar, relatif);
  const beda = path.relative(akar, penuh);

  // `beda` kosong berarti jalurnya adalah direktori akarnya sendiri; berawalan
  // `..` atau mutlak berarti ia keluar dari akar. Ketiganya ditolak.
  if (!beda || beda.startsWith('..') || path.isAbsolute(beda)) {
    return null;
  }
  return penuh;
}
