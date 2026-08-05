import api from '@/services/api';
import { adaptStatistics } from '../adapters/statistics.adapter';

/** Statistik publik (GET /statistics, INT-14, D2: TANPA autentikasi). */
export async function getStatistics() {
  const response = await api.get('/statistics');
  return adaptStatistics(response.data);
}
