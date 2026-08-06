import api from '@/services/api';
import { adaptOpdDashboard } from '../adapters/opdDashboard.adapter';

/** Dashboard ringkasan Admin OPD (GET /dashboard/opd, INT-12). */
export async function getOpdDashboard() {
  const response = await api.get('/dashboard/opd');
  return adaptOpdDashboard(response.data);
}
