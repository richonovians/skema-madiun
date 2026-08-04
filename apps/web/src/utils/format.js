/** Inisial dari nama (mis. "Rina Kirana" -> "RK"), maksimal 2 huruf. */
export function getInitials(name) {
  if (!name || typeof name !== 'string') return '';
  const parts = name
    .trim()
    .split(/\s+/)
    .map((p) => p.replace(/[^\p{L}]/gu, '')) // buang tanda baca (mis. "(Contoh)" -> "Contoh")
    .filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Format tanggal Indonesia (mis. "18 Juli 2026") dari Date atau string ISO. */
export function formatDateId(date) {
  if (!date) return '';
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}
