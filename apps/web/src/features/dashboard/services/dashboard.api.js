import api from '@/services/api';
import { adaptIkmDashboard } from '@/features/analytics/adapters/ikm.adapter';

/**
 * Dashboard agregat kabupaten (GET /dashboard/ikm, Admin Kabupaten) -- SUMBER
 * DATA UTAMA halaman /admin-kab/dashboard. Dipisah dari ikm.api.js krn beda
 * konsumen (dashboard kabupaten vs hasil per-survei), sama seperti backend
 * yang memisah keduanya di IkmController meski satu modul.
 *
 * CATATAN (2026-08-05): openComplaints/newComplaints/systemActivityPercent
 * dulu gap (menunggu INT-13), kini terisi -- lihat komentar adaptIkmDashboard
 * di ikm.adapter.js utk definisi systemActivityPercent (keputusan developer, D3).
 * `ikmGrade`/`ikmLabel` MASIH gap (`mutu` backend cuma dihitung PER-survei,
 * bukan utk rata-rata gabungan lintas OPD) -- sengaja tak diderivasi sendiri
 * di sini (beda dgn label mutu per-survei di ikm.adapter.js yang memang
 * official karena backend SUDAH hitung huruf mutu-nya).
 */
export async function getKabupatenDashboard(params = {}) {
  const response = await api.get('/dashboard/ikm', { params });
  const dashboard = adaptIkmDashboard(response.data);

  return {
    summary: {
      ikmScore: dashboard.rataRataIkm,
      ikmGrade: null, // gap, lihat catatan di atas
      ikmLabel: null, // gap, lihat catatan di atas
      totalRespondents: dashboard.totalResponden,
      openComplaints: dashboard.openComplaints,
      newComplaints: dashboard.newComplaints,
      systemActivityPercent: dashboard.systemActivityPercent,
    },
    leaderboard: dashboard.items,
    totalOpd: dashboard.totalOpd,
  };
}
