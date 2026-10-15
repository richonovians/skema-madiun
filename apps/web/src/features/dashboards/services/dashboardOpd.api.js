import api from '@/services/api';
import { adaptOpdDashboard } from '../adapters/opdDashboard.adapter';

/**
 * Dashboard ringkasan satu OPD (GET /dashboard/opd, INT-12).
 *
 * TANPA PARAMETER, dan itu disengaja. Endpoint ini hanya untuk peran `opd`, dan
 * OPD-nya diturunkan backend dari `users.opd_id`
 * (DashboardService.resolveDashboardOpdId); Admin Kabupaten ditolak 403 dengan
 * atau tanpa kueri apa pun.
 *
 * Fungsi ini sempat menerima `opdId` dan mengirimkannya sebagai `?opdId=`.
 * Backend membuang parameter itu BESERTA DTO-nya pada 6 September 2026, jadi
 * Nest mengabaikannya tanpa 400 -- kode mati yang diam-diam mengundang
 * pembaca berikutnya memakainya kembali. Dibuang 15 Oktober 2026; kedua
 * pemanggilnya memang tak pernah mengirim argumen. Jangan ditambahkan lagi:
 * memilih OPD dari klien berarti sumber kebenaran kedua yang bisa basi.
 */
export async function getOpdDashboard() {
  const response = await api.get('/dashboard/opd');
  return adaptOpdDashboard(response.data);
}
