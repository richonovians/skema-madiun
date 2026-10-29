/**
 * Penyusun dan pengunduh CSV.
 *
 * Dipisahkan karena `downloadBlob` yang sama sebelumnya disalin di dua halaman
 * monitoring dan sekali lagi di KabDashboardHeader. Penyusunannya dipisah dari
 * pengunduhannya supaya aturan pengutipan dapat diuji tanpa DOM.
 */

/**
 * Sel teks berawalan `=`, `+`, `-`, `@`, TAB, atau CR dibaca spreadsheet
 * sebagai rumus, JUGA bila berkutip -- terukur di Excel (BUG-049): `"=1+1"`
 * menjadi 2. Awalan petik tunggal membuatnya teks. Angka, teks yang memang
 * angka (`-5`, `85%`), dan `-` pengisi kosong dibiarkan supaya tetap terbaca.
 */
const BERAWALAN_RUMUS = /^[=+\-@\t\r]/;
const TEKS_ANGKA = /^[-+]?\d+([.,]\d+)?%?$/;

function netralkan(nilai) {
  if (typeof nilai === 'number') return String(nilai);
  const teks = String(nilai ?? '');
  if (teks === '-' || TEKS_ANGKA.test(teks) || !BERAWALAN_RUMUS.test(teks)) return teks;
  return `'${teks}`;
}

/** Setiap sel dikutip tanpa kecuali: lebih mudah dibaca ulang daripada menebak kapan perlu. */
const kutip = (nilai) => `"${netralkan(nilai).replace(/"/g, '""')}"`;

export function susunCsv(headers, rows) {
  return [headers.map(kutip).join(','), ...rows.map((baris) => baris.map(kutip).join(','))].join(
    '\n',
  );
}

export function unduhCsv({ namaBerkas, headers, rows }) {
  const blob = new Blob([susunCsv(headers, rows)], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const tautan = document.createElement('a');
  tautan.href = url;
  tautan.setAttribute('download', namaBerkas);
  document.body.appendChild(tautan);
  tautan.click();
  document.body.removeChild(tautan);
  URL.revokeObjectURL(url);
}
