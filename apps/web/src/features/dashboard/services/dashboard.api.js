import api from '@/services/api';
import { adaptIkmDashboard } from '@/features/analytics/adapters/ikm.adapter';

/**
 * Dashboard agregat kabupaten (GET /dashboard/ikm, Admin Kabupaten) -- SUMBER
 * DATA UTAMA halaman /admin-kab/dashboard. Dipisah dari ikm.api.js krn beda
 * konsumen (dashboard kabupaten vs hasil per-survei), sama seperti backend
 * yang memisah keduanya di IkmController meski satu modul.
 *
 * CATATAN GAP BESAR: fetchComplaintDistribution & fetchRecentActivities di
 * features/dashboard/constants/kabDashboardData.js TIDAK ADA sumber backend
 * sama sekali -- GET /dashboard/ikm cuma agregat IKM, tak pernah balas data
 * pengaduan. Ini persis INT-13 (Fase 3, "Perluas GET /dashboard/ikm utk
 * ringkasan + distribusi pengaduan + aktivitas terbaru") yang BELUM
 * dikerjakan (tidak terblokir keputusan D apa pun, murni belum dibangun --
 * kandidat kuat pekerjaan backend berikutnya). ikmGrade/ikmLabel/
 * systemActivityPercent juga tak ada di level agregat (`mutu` backend cuma
 * dihitung PER-survei, bukan utk rata-rata gabungan) -- sengaja tak diderivasi
 * sendiri di sini (beda dgn label mutu per-survei di ikm.adapter.js yang
 * memang official karena backend SUDAH hitung huruf mutu-nya).
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
      openComplaints: null, // gap: butuh INT-13
      newComplaints: null, // gap: butuh INT-13
      systemActivityPercent: null, // gap: tak ada definisi bisnis (D3)
    },
    leaderboard: dashboard.items,
    totalOpd: dashboard.totalOpd,
  };
}
