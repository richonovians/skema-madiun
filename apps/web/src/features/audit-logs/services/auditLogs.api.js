import api from '@/services/api';
import { adaptAuditLog, adaptAuditLogList } from '../adapters/auditLog.adapter';

/**
 * @param {{
 *   entitas?: string,
 *   actorId?: number,
 *   aksi?: string,
 *   search?: string,
 *   startDate?: string,
 *   endDate?: string,
 *   page?: number,
 *   limit?: number
 * }} filters
 */
export async function getAuditLogs(filters = {}) {
  const { entitas, actorId, aksi, search, startDate, endDate, page, limit } = filters;
  const response = await api.get('/audit-logs', {
    params: {
      entitas: entitas || undefined,
      actorId: actorId || undefined,
      aksi: aksi || undefined,
      search: search || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      page,
      limit,
    },
  });
  return { data: adaptAuditLogList(response.data), meta: response.meta };
}

/**
 * Lama retensi log aktivitas dalam hari; `hari: null` berarti tak ada
 * pemangkasan sama sekali.
 *
 * Dibaca dari server, BUKAN ditulis mati di frontend: keterangan retensi di
 * layar harus selalu sama dengan AUDIT_RETENTION_DAYS yang benar-benar berlaku.
 *
 * @returns {Promise<{ hari: number | null }>}
 */
export async function getAuditRetention() {
  const response = await api.get('/audit-logs/retensi');
  return response.data;
}

export async function getAuditLogDetail(id) {
  const response = await api.get(`/audit-logs/${id}`);
  return adaptAuditLog(response.data);
}