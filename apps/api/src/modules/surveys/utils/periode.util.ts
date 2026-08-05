/**
 * Format kanonik periode survei (D5+D8, 2026-08-05): `{tahun}-Q{1-4}` (mis.
 * "2026-Q2"). Dipilih krn (a) tetap muat di `Survey.periode VarChar(20)`
 * tanpa migrasi skema, (b) terurut BENAR secara leksikografis (string sort =
 * urutan kronologis, tahun dulu baru triwulan) sehingga "bisa diurutkan/
 * difilter secara sistematis" (D8) terpenuhi tanpa kolom terpisah, (c)
 * granularitas triwulan sesuai keputusan D5 (bukan per bulan kalender).
 */
export const PERIODE_REGEX = /^\d{4}-Q[1-4]$/;

const ROMAN_BY_QUARTER: Record<string, string> = { '1': 'I', '2': 'II', '3': 'III', '4': 'IV' };

export function isValidPeriode(value: string): boolean {
  return PERIODE_REGEX.test(value);
}

export function buildPeriode(tahun: number, triwulan: 1 | 2 | 3 | 4): string {
  return `${tahun}-Q${triwulan}`;
}

/**
 * Bucket sebuah tanggal ke periode triwulan kanonik (INT-14/D5) -- dipakai
 * entitas TANPA field periode sendiri (mis. `Complaint.createdAt`) supaya
 * tren tetap konsisten granularitas triwulan dgn `Survey.periode`.
 */
export function periodeFromDate(date: Date): string {
  const triwulan = (Math.floor(date.getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
  return buildPeriode(date.getFullYear(), triwulan);
}

/** "2026-Q2" -> "Triwulan II - 2026" (label ramah-baca, dipakai ekspor/tampilan). */
export function periodeLabel(periode: string): string {
  const match = PERIODE_REGEX.exec(periode);
  if (!match) {
    return periode; // data lama/tak dikenal -- tampilkan apa adanya, jangan lempar error di jalur tampilan
  }
  const [tahun, quarterDigit] = periode.split('-Q');
  return `Triwulan ${ROMAN_BY_QUARTER[quarterDigit]} - ${tahun}`;
}
