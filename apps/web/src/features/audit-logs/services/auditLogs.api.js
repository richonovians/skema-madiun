import api from '@/services/api';
import { adaptAuditLog, adaptAuditLogList } from '../adapters/auditLog.adapter';

/**
 * @param {{entitas?: string, actorId?: number, page?: number, limit?: number}} filters
 * Backend (ListAuditLogQueryDto) HANYA dukung `entitas`+`actorId` sbg filter --
 * search/dateRange/aksi/role/opd di UI lama TAK PUNYA sumber backend, sudah
 * dihapus dari AuditFilterBar.jsx (bukan disembunyikan, benar-benar dihapus).
 */
export async function getAuditLogs(filters = {}) {
  const { entitas, actorId, page, limit } = filters;
  const response = await api.get('/audit-logs', { params: { entitas, actorId, page, limit } });
  return { data: adaptAuditLogList(response.data), meta: response.meta };
}

export async function getAuditLogDetail(id) {
  const response = await api.get(`/audit-logs/${id}`);
  return adaptAuditLog(response.data);
}
