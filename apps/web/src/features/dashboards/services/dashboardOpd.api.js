import api from '@/services/api';
import { adaptOpdDashboard } from '../adapters/opdDashboard.adapter';

/**
 * Dashboard ringkasan satu OPD (GET /dashboard/opd, INT-12).
 *
 * Endpoint ini HANYA untuk peran `opd`, dan OPD-nya diturunkan backend dari
 * `users.opd_id` (DashboardService.resolveDashboardOpdId). Admin Kabupaten
 * ditolak 403 dengan atau tanpa parameter apa pun.
 *
 * @param {number} [opdId] TAK BERPENGARUH: parameter `?opdId=` beserta DTO-nya
 *   dibuang backend 6 September 2026, jadi Nest mengabaikannya tanpa 400.
 *   Parameternya sendiri tinggal menganggur di sini; JSDoc ini sempat
 *   menyatakannya WAJIB untuk superuser, peran yang dilebur 15 September 2026.
 */
export async function getOpdDashboard(opdId) {
  const response = await api.get('/dashboard/opd', {
    params: opdId ? { opdId } : undefined,
  });
  return adaptOpdDashboard(response.data);
}
