import api from '@/services/api';
import { adaptOpdDashboard } from '../adapters/opdDashboard.adapter';

/**
 * Dashboard ringkasan satu OPD (GET /dashboard/opd, INT-12).
 *
 * @param {number} [opdId] WAJIB untuk superuser (akunnya tak tertaut OPD mana
 *   pun, jadi backend menolak 400 tanpa ini); DIABAIKAN backend untuk Admin OPD
 *   sungguhan, yang selalu mendapat OPD akunnya sendiri. Admin Kabupaten tetap
 *   403 dengan atau tanpa parameter ini (keputusan user 2026-08-20).
 */
export async function getOpdDashboard(opdId) {
  const response = await api.get('/dashboard/opd', {
    params: opdId ? { opdId } : undefined,
  });
  return adaptOpdDashboard(response.data);
}
