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

export async function getAuditLogDetail(id) {
  const response = await api.get(`/audit-logs/${id}`);
  return adaptAuditLog(response.data);
}