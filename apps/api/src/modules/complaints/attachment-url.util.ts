import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * URL lampiran bertanda tangan & berbatas waktu (temuan audit T1, 7 September
 * 2026 — pendekatan (b), dipilih pengguna).
 *
 * Sebelum ini `/uploads/*` disajikan statis tanpa autentikasi apa pun; terbukti
 * `curl` tanpa kredensial menjawab 200. Yang ditutup di sini adalah akses
 * PERMANEN bagi siapa pun yang menemukan atau menebak jalurnya.
 *
 * DIIKAT PADA ORANG sejak 9 Oktober 2026 (pilihan pengguna: jalur B, tegas).
 * Semula tanda tangannya hanya mengikat jalur dan waktu, dan batas itu ditulis
 * tersurat di sini: URL-nya tak tahu siapa yang membukanya. Akibatnya terukur
 * dan bukan hipotetis — ketika peran `opd` seseorang dicabut lewat
 * `sso_cabut_peran_opd`, atau ketika ia menekan `POST /auth/logout-semua`, URL
 * lampiran yang terlanjur ia pegang TETAP SAH sampai `exp` lewat. Sesinya mati,
 * tautannya tidak.
 *
 * Kini `sub` (id pengguna) ikut ditandatangani, sehingga tautan dapat dicabut
 * per akun. YANG MASIH BERLAKU dari batas lama: dalam masa berlaku dan selama
 * akunnya tak dicabut, siapa pun yang memegang URL itu tetap dapat membaca.
 * Mengikatnya pada SESI menuntut endpoint terautentikasi lewat `assertAccess`,
 * dan itu tetap pekerjaan lain.
 *
 * KUNCI DITURUNKAN, bukan `SESSION_JWT_SECRET` apa adanya. Kalau rahasia sesi
 * dipakai langsung sebagai kunci HMAC, tanda tangan lampiran dan tanda tangan
 * lain yang memakai rahasia yang sama menjadi saling dapat dipertukarkan begitu
 * salah satu formatnya berubah. Pemisahan domain memutus kemungkinan itu
 * sekarang, sebelum ada yang bergantung padanya.
 */
/**
 * DINAIKKAN KE v2 saat `sub` masuk ke muatan (9 Oktober 2026), dan itulah yang
 * menegakkan pilihan "tegas": kunci HMAC-nya berubah, sehingga SELURUH URL
 * terbitan v1 batal seketika, bukan menunggu `exp`-nya lewat. Tanpa kenaikan
 * ini sebuah tautan lama tetap sah selama masa berlakunya dan lubang yang
 * hendak ditutup baru benar-benar tertutup berjam-jam kemudian.
 *
 * Harganya tersurat dan diterima pengguna: tab yang sedang terbuka harus
 * dimuat ulang sekali untuk mendapat tautan baru. Antarmuka sudah menganjurkan
 * itu, sebab `app.setup.ts` menjawab 403 dengan pesan "muat ulang halaman".
 */
const PEMISAH_DOMAIN = 'lampiran-url-v2';

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

function tandaTangan(pathname: string, exp: number, sub: string, secret: string): string {
  return createHmac('sha256', kunci(secret))
    .update(`${pathname}${PEMISAH}${exp}${PEMISAH}${sub}`)
    .digest('base64url');
}

/** `/uploads/...` -> `/uploads/...?exp=<epoch>&sub=<userId>&sig=<base64url>`. */
export function signAttachmentPath(
  pathname: string,
  secret: string,
  ttlSeconds: number,
  sub: number,
  now: number = Date.now(),
): string {
  const exp = Math.floor(now / 1000) + ttlSeconds;
  return `${pathname}?exp=${exp}&sub=${sub}&sig=${tandaTangan(pathname, exp, String(sub), secret)}`;
}

/**
 * Verifikasi permintaan masuk. Mengembalikan ALASAN, bukan boolean: "kedaluwarsa"
 * layak dijelaskan ke pengguna ("tautan kedaluwarsa, muat ulang halaman"),
 * sedangkan "tidak sah" adalah upaya pemalsuan dan tak perlu dijelaskan apa pun.
 */
export function verifyAttachmentPath(
  pathname: string,
  exp: string | null | undefined,
  sub: string | null | undefined,
  sig: string | null | undefined,
  secret: string,
  now: number = Date.now(),
): HasilVerifikasi {
  // `sub` WAJIB, sederajat dengan `exp` dan `sig`: tanpa pemiliknya tak ada
  // yang dapat dicabut, dan URL tanpa `sub` adalah URL terbitan v1.
  if (!exp || !sig || !sub) {
    return 'tanpa-tanda-tangan';
  }

  const expNum = Number(exp);
  if (!Number.isInteger(expNum)) {
    return 'tidak-sah';
  }

  // Tanda tangan diperiksa SEBELUM waktu: kalau kedaluwarsa dijawab lebih dulu,
  // penyerang dapat membedakan "jalur ini ada tapi tautannya basi" dari "jalur
  // ini tak pernah ada", dan itu membocorkan keberadaan berkas.
  const diharap = Buffer.from(tandaTangan(pathname, expNum, sub, secret), 'utf8');
  const diberi = Buffer.from(sig, 'utf8');
  // Panjang dibandingkan lebih dahulu: `timingSafeEqual` MELEMPAR bila panjangnya
  // beda, dan yang benar di sini menolak, bukan meledak.
  if (diberi.length !== diharap.length || !timingSafeEqual(diberi, diharap)) {
    return 'tidak-sah';
  }

  // `<=` bukan `<`: tepat pada detik kedaluwarsa masih sah, sesudahnya tidak.
  return Math.floor(now / 1000) <= expNum ? 'sah' : 'kedaluwarsa';
}
