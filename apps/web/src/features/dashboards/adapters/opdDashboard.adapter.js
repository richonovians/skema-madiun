import { formatDateId } from '@/utils/format';
import { IKM_MUTU_LABEL } from '@/utils/enumLabels';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

/**
 * Terjemahkan OpdDashboardEntity backend (GET /dashboard/opd, INT-12) ke
 * bentuk yang dipakai komponen dashboard Admin OPD (DashboardSummary/
 * PerformanceMetrics/RecentFeedback/TrendChart). Satu tempat -- perubahan
 * kontrak backend cukup diubah di sini (INT-6).
 *
 * CATATAN D4 (2026-08-05): `recentFeedback` backend SENGAJA TIDAK menyertakan
 * nama/identitas pengisi -- respons survei anonim by design. Adapter ini
 * TIDAK mengarang nama; `RecentFeedback.jsx` dirombak utk tak lagi
 * menampilkan field nama sama sekali (bukan diisi placeholder).
 */
export function adaptOpdDashboard(dashboard) {
  return {
    summary: {
      ikmScore: dashboard.ikmScore != null ? dashboard.ikmScore.toFixed(2) : '-',
      ikmGrade: dashboard.ikmMutu
        ? `${dashboard.ikmMutu} (${IKM_MUTU_LABEL[dashboard.ikmMutu]})`
        : 'Belum dapat dinilai',
      totalRespondents: dashboard.totalRespondents,
      respondentTrend:
        dashboard.respondentTrendPercent != null
          ? `${dashboard.respondentTrendPercent > 0 ? '+' : ''}${dashboard.respondentTrendPercent}% dari bulan lalu`
          : 'Belum ada data pembanding',
      activeTickets: dashboard.activeTickets,
      activeOpdUsers: dashboard.activeOpdUsers,
      avgResponseTime: dashboard.avgResponseHours != null ? `${dashboard.avgResponseHours} Jam` : 'Belum ada data',
      slaTarget: `${dashboard.slaTargetHours} Jam`,
      completionRate: dashboard.completionRate,
      // Nilai MENTAH ikut diteruskan (bukan cuma versi terformat di atas):
      // DashboardSummary perlu MEMBANDINGKAN, bukan sekadar mencetak. Sebelum
      // ini kartu SLA selalu berbunyi "Sesuai target SLA" walau realisasinya
      // melewati target, dan tren responden selalu diberi warna/ikon positif
      // walau persentasenya negatif -- keduanya klaim yang tak didukung data.
      respondentTrendPercent: dashboard.respondentTrendPercent,
      avgResponseHours: dashboard.avgResponseHours,
      slaTargetHours: dashboard.slaTargetHours,
    },
    performanceMetrics: dashboard.performanceMetrics.map((m) => ({
      name: m.name,
      realization: m.realization,
      target: m.target,
    })),
    recentFeedback: dashboard.recentFeedback.map((f) => ({
      id: f.id,
      comment: f.text,
      rating: f.ratingAvg != null ? Math.round(f.ratingAvg) : null,
      time: formatDateId(f.submittedAt),
    })),
    ikmTrend: dashboard.ikmTrend.map((p) => ({
      periode: formatPeriodeLabel(p.periode),
      nilaiIkm: p.value,
    })),
  };
}
