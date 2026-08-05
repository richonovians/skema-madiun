/**
 * Terjemahkan AuditLogEntity (sudah diadaptasi auditLog.adapter.js, GET
 * /audit-logs) ke bentuk yang dipakai RecentActivities.jsx (INT-24, dashboard
 * Kabupaten). Bukan "aktivitas publikasi" spesifik (dummy lama karang nama
 * OPD+ikon per-domain mis. RSUD/DPMPTSP) -- audit trail memuat SEMUA aksi
 * tercatat (create/update/delete survei/pengaduan/dll), jadi ditampilkan
 * jujur sbg "aktivitas sistem terbaru", bukan dipaksa terlihat spt publikasi.
 */
const ENTITAS_ICON = {
  complaint: 'report',
  opd: 'foundation',
  question: 'quiz',
  survey: 'school',
  user: 'badge',
};

/** "5 menit lalu" / "3 jam lalu" / "Kemarin" / "12 Jul 2026". */
function formatRelativeTime(date) {
  const target = new Date(date);
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

export function adaptRecentActivity(auditLog) {
  return {
    id: auditLog.id,
    icon: ENTITAS_ICON[auditLog.entitas] ?? 'report',
    title: auditLog.summary,
    publisher: auditLog.user ?? 'Sistem',
    timeLabel: formatRelativeTime(auditLog.createdAt),
    link: `/admin-kab/audit-logs/${auditLog.id}`,
  };
}

export function adaptRecentActivityList(auditLogs) {
  return auditLogs.map(adaptRecentActivity);
}
