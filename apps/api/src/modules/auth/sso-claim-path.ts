/**
 * Pembaca jalur klaim bersarang, dipisah titik (28 September 2026).
 *
 * KENAPA ADA. Contoh payload `userinfo` Helpdesk akhirnya diterima, dan dua
 * nilai yang paling dibutuhkan ternyata BERSARANG:
 *
 *   identity.user_type    -> `asn` atau `masyarakat`, penentu peran SKEMA
 *   governance.tenant_id  -> UUID tenant, sama dengan `opd.external_id`
 *
 * Kedua pembaca klaim yang sudah ada (`sso-role.mapper.ts` &
 * `sso-opd.mapper.ts`) hanya membaca kunci tingkat atas lewat `klaim[field]`,
 * sehingga keduanya tak akan pernah menemukan nilai-nilai itu betapapun
 * benarnya env diisi.
 *
 * FUNGSI MURNI, dipakai bersama oleh kedua pemeta. Alasannya sama seperti
 * `sso-opd.mapper.ts`: ini titik tempat kesalahan berakibat seseorang memegang
 * peran atau tertaut ke instansi yang bukan miliknya, dan kode sependek ini
 * jauh lebih mudah diuji tuntas sendirian daripada lewat Prisma dan JWT.
 *
 * KOMPATIBEL KE BELAKANG. Jalur tanpa titik berperilaku persis seperti
 * `klaim[field]` sebelumnya, jadi seluruh nilai `HELPDESK_SSO_OPD_CLAIM` yang
 * sudah terpasang di lingkungan mana pun tidak berubah artinya.
 */

/**
 * Hanya objek biasa yang boleh ditelusuri.
 *
 * Array SENGAJA ditolak walau `typeof`-nya juga `'object'`. Membiarkannya
 * berarti `groups.0` menjadi jalur yang sah, dan sebuah indeks bukan nama
 * klaim — env yang salah tulis akan diam-diam menarik keluar satu elemen
 * alih-alih gagal dengan jelas.
 */
function objekBiasa(nilai: unknown): nilai is Record<string, unknown> {
  return typeof nilai === 'object' && nilai !== null && !Array.isArray(nilai);
}

/**
 * Nilai pada `jalur` di dalam `klaim`, atau `undefined` bila tak terjangkau.
 *
 * TIDAK PERNAH MELEMPAR. Payload datang dari jaringan dan env ditulis manusia;
 * keduanya dapat berbentuk apa pun. Galat di sini berarti seseorang gagal masuk
 * hanya karena satu nama field salah ketik, padahal jalan amannya selalu
 * tersedia yaitu memperlakukan klaimnya sebagai tidak ada.
 *
 * `null` DIBEDAKAN dari ketiadaan: `governance.banned_until` yang bernilai null
 * benar-benar ada, dan menyamakan keduanya menyembunyikan beda yang kelak
 * dibutuhkan.
 */
export function ambilJalurKlaim(
  klaim: Record<string, unknown> | undefined | null,
  jalur: string,
): unknown {
  if (!objekBiasa(klaim)) {
    return undefined;
  }

  const langkah = jalur
    .split('.')
    .map((bagian) => bagian.trim())
    .filter(Boolean);
  if (langkah.length === 0) {
    return undefined;
  }

  let sekarang: unknown = klaim;
  for (const nama of langkah) {
    if (!objekBiasa(sekarang)) {
      return undefined;
    }
    // `hasOwnProperty`, BUKAN `in` maupun akses langsung: `constructor`,
    // `toString`, dan `__proto__` ada pada setiap objek lewat prototipe.
    // Membacanya berarti env yang salah tulis dapat menarik keluar fungsi
    // bawaan JavaScript dan memasukkannya ke daftar kandidat peran.
    if (!Object.prototype.hasOwnProperty.call(sekarang, nama)) {
      return undefined;
    }
    sekarang = (sekarang as Record<string, unknown>)[nama];
  }
  return sekarang;
}
