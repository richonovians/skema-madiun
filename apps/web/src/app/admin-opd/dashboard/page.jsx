'use client';

import React, { useCallback, useMemo } from 'react';
import OpdDashboardHeader from '@/features/dashboards/components/OpdDashboardHeader';
import DashboardSummary from '@/features/dashboards/components/DashboardSummary';
import TrendChart from '@/features/statistics/components/charts/TrendChart';
import PeriodSurveyPerformance from '@/features/dashboards/components/PeriodSurveyPerformance';
import ComplaintStatusBreakdown from '@/features/dashboards/components/ComplaintStatusBreakdown';
import PerformanceMetrics from '@/features/dashboards/components/PerformanceMetrics';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { useAdminLayout } from '@/components/layouts/AdminLayoutProvider';
import { getOpdDashboard } from '@/features/dashboards/services/dashboardOpd.api';
import { getSurveys } from '@/features/surveys/services/surveys.api';
import { getComplaints } from '@/features/complaints/services/complaints.api';
import { cocokPeriode, periodeFromDate } from '@/features/surveys/adapters/survey.adapter';

const LIST_LIMIT = 100; // batas maksimum `limit` PaginationQueryDto backend

/**
 * INT-12: sebelumnya 100% dummy (setTimeout + data hardcode). Kini pakai
 * GET /dashboard/opd sungguhan -- lihat opdDashboard.adapter.js utk
 * penjelasan tiap field (termasuk gap D4: recentFeedback tanpa identitas).
 *
 * Daftar survei & pengaduan diambil SEKALI di sini (keduanya sudah disaring
 * backend ke OPD pengguna) lalu diiris per triwulan di klien: `GET /dashboard/opd`
 * tak menerima parameter periode sama sekali, sehingga penyaring triwulan di
 * navbar (lihat AdminLayoutProvider) tak mungkin dilayani server. Mengiris di
 * klien juga berarti berganti triwulan tak memicu permintaan jaringan baru.
 */
export default function AdminDashboardPage() {
  const { periode } = useAdminLayout();

  const fetchDashboard = useCallback(async () => {
    // `opdId` tak lagi dikirim dari klien (5 September 2026): halaman ini hanya
    // terbuka bagi sesi yang sedang bertindak sebagai `opd` (proxy.js), dan
    // backend menurunkan instansinya dari `users.opd_id` --
    // DashboardService.resolveDashboardOpdId. Superuser yang ingin membukanya
    // harus punya role `opd` beserta tautan OPD-nya.
    const [dashboard, surveysResult, complaintsResult] = await Promise.all([
      getOpdDashboard(),
      getSurveys({ limit: LIST_LIMIT }),
      getComplaints({ limit: LIST_LIMIT }),
    ]);
    return {
      dashboard,
      surveys: surveysResult.data,
      complaints: complaintsResult.data,
      complaintsTotal: complaintsResult.meta?.pagination?.total ?? complaintsResult.data.length,
    };
  }, []);

  const { data, isLoading, error, refetch } = useAsync(fetchDashboard);

  // `cocokPeriode`, BUKAN kesamaan string persis (7 Oktober 2026, laporan
  // pengguna: "Kinerja Periode dan Status Pengaduan tidak menampilkan data"
  // saat memilih Semua Triwulan).
  //
  // Sampai penyaring periode dipisah menjadi Tahun + Triwulan (6 Oktober 2026),
  // `periode` SELALU berbentuk kanonik `2026-Q4` dan `===` memang memadai.
  // "Semua Triwulan" melahirkan bentuk kedua -- tahun saja, `2026` -- yang tak
  // pernah sama dengan periode survei mana pun, sehingga kedua bagian ini
  // kosong total. `cocokPeriode` mengurai keduanya lebih dulu dan mencocokkan
  // tahun lalu triwulan, jadi ia menerima kedua bentuk itu. Ia juga tidak
  // memakai `startsWith`, yang akan menganggap `20261-Q1` cocok dengan `2026`.
  const periodSurveys = useMemo(
    () => (data?.surveys ?? []).filter((survey) => cocokPeriode(survey.period, periode)),
    [data, periode],
  );

  const periodComplaints = useMemo(
    // Pengaduan tak punya field periode -- dibucket dari createdAt, cara yang
    // sama dipakai backend untuk tren pengaduan per triwulan.
    () =>
      (data?.complaints ?? []).filter((c) =>
        cocokPeriode(periodeFromDate(c.createdAt), periode),
      ),
    [data, periode],
  );

  if (isLoading) {
    return <LoadingState label="Memuat dashboard..." />;
  }

  if (error) {
    return <ErrorState title="Gagal memuat dashboard" description={error.message} onRetry={refetch} />;
  }

  const ikmTrendData = data.dashboard.ikmTrend.map((p) => ({ month: p.periode, nilaiIkm: p.nilaiIkm }));

  return (
    <>
      <OpdDashboardHeader periode={periode} />

      {/* Angka akun aktif kini menjadi kartu kelima di dalam DashboardSummary
          (15 September 2026, permintaan pengguna), bukan strip tersendiri. */}
      <DashboardSummary summaryData={data.dashboard.summary} />

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <PeriodSurveyPerformance surveys={periodSurveys} periode={periode} />
        <ComplaintStatusBreakdown
          complaints={periodComplaints}
          periode={periode}
          totalAll={data.complaintsTotal}
          completionRate={data.dashboard.summary.completionRate}
        />
      </section>

      {ikmTrendData.length > 0 && (
        <TrendChart data={ikmTrendData} title="Tren Nilai IKM per Triwulan" dataKey="nilaiIkm" yMin={0} yMax={100} />
      )}

      <PerformanceMetrics metrics={data.dashboard.performanceMetrics} />
    </>
  );
}
