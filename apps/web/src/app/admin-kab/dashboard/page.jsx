'use client';
import React, { useCallback } from 'react';
import KabDashboardHeader from '@/features/dashboard/components/kabupaten/KabDashboardHeader';
import KabSummaryMetrics from '@/features/dashboard/components/kabupaten/KabSummaryMetrics';
import IkmLeaderboard from '@/features/dashboard/components/kabupaten/IkmLeaderboard';
import ComplaintStatusDonut from '@/features/dashboard/components/kabupaten/ComplaintStatusDonut';
import RecentActivities from '@/features/dashboard/components/kabupaten/RecentActivities';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getKabupatenDashboard } from '@/features/dashboard/services/dashboard.api';
import { adaptRecentActivityList } from '@/features/dashboard/adapters/recentActivities.adapter';

import { Users, FileText, CheckCircle, Clock, Building2, TrendingUp } from 'lucide-react';
import { getStatistics } from '@/features/statistics/services/statistics.api';
import { getAuditLogs } from '@/features/audit-logs/services/auditLogs.api';
import MetricCard from '@/features/statistics/components/MetricCard';
import TrendChart from '@/features/statistics/components/charts/TrendChart';
import BarChart from '@/features/statistics/components/charts/BarChart';
import HorizontalProgress from '@/features/statistics/components/charts/HorizontalProgress';

const RECENT_ACTIVITIES_LIMIT = 5;

/**
 * INT-24 (2026-08-05): SEBELUMNYA 100% dummy terpisah (kabDashboardData.js +
 * dummyStatisticsResponse), TAK PERNAH memanggil layanan asli yang sudah ada
 * sejak lama (`getKabupatenDashboard`, INT-13). Kini gabungkan 3 sumber nyata:
 * - `getKabupatenDashboard()` (GET /dashboard/ikm): ringkasan Kabupaten +
 *   leaderboard OPD.
 * - `getStatistics()` (GET /statistics, publik) -- endpoint yang sama dgn
 *   halaman /statistics, dipakai ulang di sini utk bento grid ringkasan
 *   kinerja + tren IKM + distribusi nilai + 9 unsur (wajar, admin yg login
 *   pun boleh baca data publik).
 * - `getAuditLogs({limit:5})` (GET /audit-logs, INT-34) -- pengganti jujur
 *   utk "aktivitas terbaru" (dummy lama karang nama OPD+ikon per-domain
 *   spt RSUD/DLH yang tak py padanan data nyata).
 * `filters` (year/service) DIHAPUS -- tak ada UI apa pun yg pernah mengisi
 * query param ini (KabDashboardHeader cuma tombol ekspor, tanpa dropdown
 * filter), dan endpoint nyata tak dukung filter tahun/layanan bentuk ini.
 */
export default function AdminKabDashboardPage() {
  const fetchDashboard = useCallback(async () => {
    const [kabDashboard, statistics, auditLogs] = await Promise.all([
      getKabupatenDashboard(),
      getStatistics(),
      getAuditLogs({ limit: RECENT_ACTIVITIES_LIMIT }),
    ]);
    return { kabDashboard, statistics, activities: adaptRecentActivityList(auditLogs.data) };
  }, []);
  const { data, isLoading, error, refetch } = useAsync(fetchDashboard);

  if (isLoading) {
    return <LoadingState label="Memuat dashboard..." />;
  }

  if (error) {
    return <ErrorState title="Gagal memuat dashboard" description={error.message} onRetry={refetch} />;
  }

  const { kabDashboard, statistics, activities } = data;
  const { summary } = statistics;
  const leaderboardData = kabDashboard.leaderboard.map((item) => ({
    opdId: item.opdId,
    opdName: item.opdName,
    ikmScore: item.ikmScore,
    respondents: item.jumlahResponden,
  }));

  return (
    <div className="min-h-screen p-lg space-y-lg relative">
      <KabDashboardHeader summary={summary} />

      <KabSummaryMetrics data={kabDashboard.summary} />

      {/* Ringkasan KPI (bento grid, sumber sama dgn /statistics publik) */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
          <TrendingUp size={24} className="text-primary" />
          Ringkasan Kinerja Terkini (Detail Lengkap)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard
            title="Indeks Kepuasan Masyarakat"
            value={summary.ikm != null ? summary.ikm.toFixed(2) : '-'}
            subtitle="Dari skala 100"
            icon={TrendingUp}
            colorClass="text-primary"
          />
          <MetricCard
            title="Total Responden"
            value={summary.totalRespondents.toLocaleString('id-ID')}
            subtitle="Masyarakat yang berpartisipasi"
            icon={Users}
            colorClass="text-blue-600"
          />
          <MetricCard
            title="Total Pengaduan"
            value={summary.totalComplaints.toLocaleString('id-ID')}
            subtitle="Aduan masuk sistem"
            icon={FileText}
            colorClass="text-orange-500"
          />
          <MetricCard
            title="Tingkat Penyelesaian"
            value={summary.completionRate != null ? `${summary.completionRate}%` : '-'}
            subtitle="Pengaduan yang diselesaikan"
            icon={CheckCircle}
            colorClass="text-emerald-600"
          />
          <MetricCard
            title="Rata-rata SLA"
            value={summary.avgSlaDays != null ? `${summary.avgSlaDays} Hari` : '-'}
            subtitle="Waktu respon pengaduan"
            icon={Clock}
            colorClass="text-indigo-500"
          />
          <MetricCard
            title="Jumlah OPD Aktif"
            value={summary.activeOpd}
            subtitle="Terintegrasi dengan sistem"
            icon={Building2}
            colorClass="text-slate-600"
          />
        </div>
      </section>

      {/* Visualisasi SKM */}
      <section className="mt-8">
        <div className="mb-6 border-b border-border pb-2">
          <h2 className="text-2xl font-bold text-text-primary">Statistik Kepuasan Masyarakat (SKM) & Penilaian Unsur</h2>
          <p className="text-text-secondary">Analisis tren dan distribusi penilaian layanan publik berdasarkan PermenPAN RB.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tren IKM */}
          <div className="lg:col-span-2 w-full overflow-x-auto hide-scrollbar">
            <div className="min-w-[600px]">
              {statistics.ikmTrend.length > 0 ? (
                <TrendChart
                  title="Tren Indeks Kepuasan Masyarakat per Triwulan"
                  data={statistics.ikmTrend}
                  dataKey="value"
                  yMin={0}
                  yMax={100}
                />
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm text-sm text-text-secondary h-full flex items-center justify-center">
                  Belum ada hasil IKM yang tercatat.
                </div>
              )}
            </div>
          </div>

          {/* Distribusi Nilai */}
          <div className="w-full overflow-x-auto hide-scrollbar">
            <div className="min-w-[300px]">
              {statistics.valueDistribution.length > 0 ? (
                <BarChart title="Distribusi Nilai Penilaian" data={statistics.valueDistribution} />
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm text-sm text-text-secondary h-full flex items-center justify-center">
                  Belum ada jawaban tercatat.
                </div>
              )}
            </div>
          </div>

          {/* 9 Unsur Pelayanan */}
          <div className="lg:col-span-3 w-full overflow-x-auto hide-scrollbar">
            <div className="min-w-[600px]">
              {statistics.serviceElements.length > 0 ? (
                <HorizontalProgress title="Penilaian 9 Unsur Pelayanan (PermenPAN RB)" data={statistics.serviceElements} />
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm text-sm text-text-secondary">
                  Belum ada hasil IKM yang tercatat.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mt-8">
        <div className="lg:col-span-2 w-full overflow-x-auto hide-scrollbar">
          <div className="min-w-[500px]">
            <IkmLeaderboard data={leaderboardData} />
          </div>
        </div>
        <div className="w-full overflow-x-auto hide-scrollbar">
          <div className="min-w-[300px]">
            <ComplaintStatusDonut data={statistics.complaintStatus} />
          </div>
        </div>
      </div>

      <RecentActivities data={activities} />
    </div>
  );
}
