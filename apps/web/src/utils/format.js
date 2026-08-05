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

/** "5 menit lalu" / "3 jam lalu" / "Kemarin" / "12 Jul 2026" (INT-24/D9). */
export function formatRelativeTime(date) {
  if (!date) return '';
  const target = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(target.getTime())) return '';
  const diffMs = Date.now() - target.getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  if (diffMinutes < 1) return 'Baru saja';
  if (diffMinutes < 60) return `${diffMinutes} menit lalu`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours} jam lalu`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Kemarin';
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return target.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}
