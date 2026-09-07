import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * URL lampiran bertanda tangan & berbatas waktu (temuan audit T1, 7 September
 * 2026 — pendekatan (b), dipilih pengguna).
 *
 * Sebelum ini `/uploads/*` disajikan statis tanpa autentikasi apa pun; terbukti
 * `curl` tanpa kredensial menjawab 200. Yang ditutup di sini adalah akses
 * PERMANEN bagi siapa pun yang menemukan atau menebak jalurnya.
 *
 * BATAS PENDEKATAN INI, ditulis tersurat supaya tak ada yang mengira lebih:
 * URL-nya sendiri adalah kredensialnya. Ia tak tahu siapa yang membukanya, jadi
 * siapa pun yang memegangnya dalam masa berlaku dapat membaca lampiran itu.
 * Yang mengikatnya pada seseorang hanyalah pendekatan (a) — endpoint
 * terautentikasi lewat `assertAccess`.
 *
 * KUNCI DITURUNKAN, bukan `SESSION_JWT_SECRET` apa adanya. Kalau rahasia sesi
 * dipakai langsung sebagai kunci HMAC, tanda tangan lampiran dan tanda tangan
 * lain yang memakai rahasia yang sama menjadi saling dapat dipertukarkan begitu
 * salah satu formatnya berubah. Pemisahan domain memutus kemungkinan itu
 * sekarang, sebelum ada yang bergantung padanya.
 */
const PEMISAH_DOMAIN = 'lampiran-url-v1';

/**
 * Pemisah antara jalur dan exp di dalam masukan HMAC. `\n` dipilih karena TIDAK
 * MUNGKIN muncul di jalur lampiran: nama berkasnya sudah dibersihkan menjadi
 * `[a-zA-Z0-9.\-_]` (lihat attachment.util.ts). Tanpa pemisah yang mustahil
 * muncul, `("/a/b", 12)` dan `("/a/b1", 2)` dapat menghasilkan masukan yang
 * sama — dan satu tanda tangan jadi sah untuk dua permintaan berbeda.
 */
const PEMISAH = '\n';

export type HasilVerifikasi = 'sah' | 'kedaluwarsa' | 'tidak-sah' | 'tanpa-tanda-tangan';

function kunci(secret: string): Buffer {
  return createHmac('sha256', secret).update(PEMISAH_DOMAIN).digest();
}

function tandaTangan(pathname: string, exp: number, secret: string): string {
  return createHmac('sha256', kunci(secret))
    .update(`${pathname}${PEMISAH}${exp}`)
    .digest('base64url');
}

/** `/uploads/...` -> `/uploads/...?exp=<epoch>&sig=<base64url>`. */
export function signAttachmentPath(
  pathname: string,
  secret: string,
  ttlSeconds: number,
  now: number = Date.now(),
): string {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `${pathname}?exp=${exp}&sig=${tandaTangan(pathname, exp, secret)}`;
}

/**
 * Verifikasi permintaan masuk. Mengembalikan ALASAN, bukan boolean: "kedaluwarsa"
 * layak dijelaskan ke pengguna ("tautan kedaluwarsa, muat ulang halaman"),
 * sedangkan "tidak sah" adalah upaya pemalsuan dan tak perlu dijelaskan apa pun.
 */
export function verifyAttachmentPath(
  pathname: string,
  exp: string | null | undefined,
  sig: string | null | undefined,
  secret: string,
  now: number = Date.now(),
): HasilVerifikasi {
  if (!exp || !sig) {
    return 'tanpa-tanda-tangan';
  }

  const expNum = Number(exp);
  if (!Number.isInteger(expNum)) {
    return 'tidak-sah';
  }

  // Tanda tangan diperiksa SEBELUM waktu: kalau kedaluwarsa dijawab lebih dulu,
  // penyerang dapat membedakan "jalur ini ada tapi tautannya basi" dari "jalur
  // ini tak pernah ada", dan itu membocorkan keberadaan berkas.
  const diharap = Buffer.from(tandaTangan(pathname, expNum, secret), 'utf8');
  const diberi = Buffer.from(sig, 'utf8');
  // Panjang dibandingkan lebih dahulu: `timingSafeEqual` MELEMPAR bila panjangnya
  // beda, dan yang benar di sini menolak, bukan meledak.
  if (diberi.length !== diharap.length || !timingSafeEqual(diberi, diharap)) {
    return 'tidak-sah';
  }

  // `<=` bukan `<`: tepat pada detik kedaluwarsa masih sah, sesudahnya tidak.
  return Math.floor(now / 1000) <= expNum ? 'sah' : 'kedaluwarsa';
}
