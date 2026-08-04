import api from '@/services/api';
import { adaptOpd, adaptOpdList } from '../adapters/opd.adapter';

/** @param {{search?: string, isActive?: boolean, page?: number, limit?: number}} params */
export async function getOpdList(params = {}) {
  const response = await api.get('/opd', { params });
  return { data: adaptOpdList(response.data), meta: response.meta };
}

export async function getOpdById(opdId) {
  const response = await api.get(`/opd/${opdId}`);
  return adaptOpd(response.data);
}

/**
 * Sinkronkan cache OPD dari Helpdesk (OPD adalah read-only cache -- TIDAK ada
 * create/update manual, lihat keputusan D10 di docs/Rencana-Integrasi-Frontend-Backend.md).
 * @returns {Promise<{fetched: number, created: number, updated: number, deactivated: number, skipped: number}>}
 */
export async function syncOpd() {
  const response = await api.post('/opd/sync');
  return response.data;
}
