import { IKM_MUTU_LABEL } from '@/utils/enumLabels';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

/**
 * Terjemahkan IkmResultEntity backend (GET /surveys/:id/results) ke bentuk yang
 * dipakai komponen. Satu
 * tempat -- perubahan kontrak backend cukup diubah di sini (INT-6).
 *
 * Label mutu (A=Sangat Baik dst, lihat utils/enumLabels.js) BUKAN dikarang --
 * tabel resmi PermenPANRB 14/2017 (docs/PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md
 * baris 388-395), sama seperti yang dipakai IkmService.mutuFromNilai di
 * backend, cuma huruf mutu (A/B/C/D) itu sendiri sudah dihitung backend, di
 * sini cuma tambah label deskriptifnya.
 *
 * CATATAN GAP: `trend` per unsur & `skmYearlyTrend` (tren multi-tahun) TIDAK
 * ADA sumber backend -- perlu data historis lintas periode yang belum
 * dibangun (Fase 3, INT-15, terblokir keputusan D5). Jangan dikarang di sini.
 * `skmDistribution` (sebaran skor tiap unsur per kategori nilai) juga tak
 * tersedia -- backend cuma simpan NRR rata-rata, bukan distribusi per nilai.
 */

export function adaptIkmMetrics(result) {
  return {
    ikm: {
      value: result.nilaiIkm,
      trend: null, // gap: butuh data historis, lihat catatan di atas
      status: null,
    },
    totalRespondents: {
      value: result.jumlahResponden,
      badge: null,
    },
    quality: {
      grade: result.mutu ? `${result.mutu} - ${IKM_MUTU_LABEL[result.mutu]}` : null,
    },
  };
}

export function adaptIkmServiceElements(nrrPerUnsur) {
  return nrrPerUnsur.map((u) => ({
    code: u.kodeUnsur,
    name: u.teks,
    nrr: u.nrr,
    weighted: u.nrrTertimbang,
    status: null, // gap: backend tak hitung mutu per-unsur, hanya per-survei
    trend: null, // gap: butuh data historis, lihat catatan di atas
  }));
}

/**
 * Terjemahkan IkmDashboardItemEntity (GET /dashboard/ikm, Admin Kabupaten) ke
 * bentuk yang dipakai IkmLeaderboard.jsx (opdId/opdName/ikmScore).
 */
export function adaptIkmDashboardItem(item) {
  return {
    peringkat: item.peringkat,
    opdId: item.opdId,
    opdName: item.opdNama,
    jenisLayanan: item.jenisLayanan,
    surveyId: item.surveyId,
    judul: item.judul,
    periode: formatPeriodeLabel(item.periode),
    ikmScore: item.nilaiIkm,
    mutu: item.mutu,
    jumlahResponden: item.jumlahResponden,
  };
}

export function adaptIkmDashboard(dashboard) {
  return {
    items: dashboard.items.map(adaptIkmDashboardItem),
    rataRataIkm: dashboard.rataRataIkm,
    totalOpd: dashboard.totalOpd,
    totalResponden: dashboard.totalResponden,
    // INT-13 (2026-08-05): dulu gap total, kini terisi dari GET /dashboard/ikm
    // yg diperluas. systemActivityPercent = definisi developer (D3, lihat
    // komentar backend DashboardService) -- proxy "% OPD aktif dgn survei
    // aktif saat ini", BUKAN metrik resmi Diskominfo.
    openComplaints: dashboard.openComplaints,
    newComplaints: dashboard.newComplaints,
    systemActivityPercent: dashboard.systemActivityPercent,
  };
}
