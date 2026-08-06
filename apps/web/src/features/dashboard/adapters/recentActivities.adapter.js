import { formatRelativeTime } from '@/utils/format';

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
