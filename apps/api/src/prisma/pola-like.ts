/**
 * Loloskan karakter pola LIKE dari masukan yang dimaksudkan HARFIAH.
 *
 * Di Postgres, Prisma menerjemahkan `contains`, `startsWith`, `endsWith`, dan
 * `equals` + `mode: 'insensitive'` menjadi `LIKE`/`ILIKE` -- dan TIDAK
 * meloloskan `%` maupun `_` (BUG-051, 28 Oktober 2026, terukur: `search=%`
 * di `/opd` mengembalikan ke-65 OPD, `search=_` di `/audit-logs` 3518 baris
 * alih-alih 597). Garis miring terbalik adalah karakter escape bawaan `ILIKE`,
 * jadi ia sendiri ikut diloloskan.
 *
 * Wajib dipakai setiap kali teks dari pengguna ATAU dari pihak luar (klaim
 * SSO) masuk ke salah satu operator di atas.
 */
export function lolosPolaLike(teks: string): string {
  return teks.replace(/[\\%_]/g, (karakter) => `\\${karakter}`);
}
