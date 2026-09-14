/**
 * Penyusun dan pengunduh CSV.
 *
 * Dipisahkan karena `downloadBlob` yang sama sebelumnya disalin di dua halaman
 * monitoring dan sekali lagi di KabDashboardHeader. Penyusunannya dipisah dari
 * pengunduhannya supaya aturan pengutipan dapat diuji tanpa DOM.
 */

/** Setiap sel dikutip tanpa kecuali: lebih mudah dibaca ulang daripada menebak kapan perlu. */
const kutip = (nilai) => `"${String(nilai ?? '').replace(/"/g, '""')}"`;

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
