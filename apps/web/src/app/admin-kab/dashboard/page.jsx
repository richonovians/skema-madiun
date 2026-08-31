'use client';
import React, { useCallback } from 'react';
import KabDashboardHeader from '@/features/dashboard/components/kabupaten/KabDashboardHeader';
import KabSummaryMetrics from '@/features/dashboard/components/kabupaten/KabSummaryMetrics';
import KabFilterScopeNote from '@/features/dashboard/components/kabupaten/KabFilterScopeNote';
import IkmLeaderboard from '@/features/dashboard/components/kabupaten/IkmLeaderboard';
import ComplaintStatusDonut from '@/features/dashboard/components/kabupaten/ComplaintStatusDonut';
import RecentActivities from '@/features/dashboard/components/kabupaten/RecentActivities';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { useAdminKabLayout } from '@/components/layouts/AdminKabLayoutProvider';
import { getKabupatenDashboard } from '@/features/dashboard/services/dashboard.api';
import { adaptRecentActivityList } from '@/features/dashboard/adapters/recentActivities.adapter';

import { Users, FileText, CheckCircle, Clock, Building2, TrendingUp } from 'lucide-react';
import { getStatistics } from '@/features/statistics/services/statistics.api';
import { getAuditLogs } from '@/features/audit-logs/services/auditLogs.api';
import { getMyProfile } from '@/features/profile/services/profile.api';
import { USER_ROLES } from '@/features/users/constants/userConstants';
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
 * PENYARING (2026-08-19): `periode` & `jenisLayanan` dari navbar kini
 * DITERUSKAN ke `GET /dashboard/ikm` -- endpoint itu memang menerima keduanya
 * (DashboardIkmQueryDto). Sebelumnya navbar cuma menulis `?year=&service=` yang
 * tak dibaca siapa pun, sehingga catatan lama di sini ("filters DIHAPUS")
 * menjelaskan separuh cerita saja: query param-nya dibuang di halaman ini, tapi
 * dropdown-nya dibiarkan hidup di navbar tanpa pernah berefek.
 *
 * Sengaja DUA useAsync, bukan satu Promise.all seperti sebelumnya: hanya
 * `/dashboard/ikm` yang bergantung pada penyaring. `/statistics` (agregat
 * publik, banyak query) dan `/audit-logs` tak menerima parameter apa pun, jadi
 * tak perlu diambil ulang tiap kali pengguna berganti triwulan.
 * Cakupan tiap penyaring dijelaskan ke pengguna lewat KabFilterScopeNote.
 */
export default function AdminKabDashboardPage() {
  const { periode, jenisLayanan } = useAdminKabLayout();

  // Parameter kosong TIDAK dikirim: backend mencocokkan `periode`/`jenisLayanan`
  // secara persis, jadi mengirim string kosong akan menyaring habis semuanya.
  const fetchFiltered = useCallback(
    () =>
      getKabupatenDashboard({
        ...(periode ? { periode } : {}),
        ...(jenisLayanan ? { jenisLayanan } : {}),
      }),
    [periode, jenisLayanan],
  );
  const {
    data: kabDashboard,
    isLoading: isLoadingFiltered,
    error: errorFiltered,
    refetch: refetchFiltered,
  } = useAsync(fetchFiltered);

  const fetchGlobal = useCallback(async () => {
    // Log aktivitas kini HANYA untuk superuser (2026-08-20). Perannya harus
    // diketahui DULU: kalau `/audit-logs` tetap dipanggil oleh Admin Kabupaten
    // biasa, backend menjawab 403 dan -- karena satu Promise.all -- SELURUH
    // dashboard gagal memuat, bukan cuma seksi aktivitasnya.
    const profile = await getMyProfile();
    const isSuperuser = profile.role === USER_ROLES.SUPERUSER;

    const [statistics, auditLogs] = await Promise.all([
      getStatistics(),
      isSuperuser ? getAuditLogs({ limit: RECENT_ACTIVITIES_LIMIT }) : Promise.resolve(null),
    ]);
    return {
      statistics,
      // `null` (bukan array kosong) supaya seksi aktivitas bisa DISEMBUNYIKAN
      // sepenuhnya, bukan tampil seolah "belum ada aktivitas" padahal sebenarnya
      // memang tak boleh dilihat.
      activities: auditLogs ? adaptRecentActivityList(auditLogs.data) : null,
    };
  }, []);
  const {
    data: global,
    isLoading: isLoadingGlobal,
    error: errorGlobal,
    refetch: refetchGlobal,
  } = useAsync(fetchGlobal);

  if (isLoadingFiltered || isLoadingGlobal) {
    return <LoadingState label="Memuat dashboard..." />;
  }

  const error = errorFiltered ?? errorGlobal;
  if (error) {
    return (
      <ErrorState
        title="Gagal memuat dashboard"
        description={error.message}
        onRetry={() => {
          refetchFiltered();
          refetchGlobal();
        }}
      />
    );
  }

  const { statistics, activities } = global;
  const { summary } = statistics;
  // `surveyId` DIIKUTKAN (31 Agustus 2026) walau tak ditampilkan: itulah
  // identitas satu baris leaderboard, dan IkmLeaderboard memakainya sebagai
  // React key. Sebelumnya proyeksi ini membuangnya sehingga key jatuh ke
  // `opdId` -- yang bukan identitas baris, sebab satu OPD boleh punya beberapa
  // survei. Kalau ditanggalkan lagi, key-nya menjadi undefined dan React
  // memperingatkan "should have a unique key".
  const leaderboardData = kabDashboard.leaderboard.map((item) => ({
    surveyId: item.surveyId,
    opdId: item.opdId,
    opdName: item.opdName,
    ikmScore: item.ikmScore,
    respondents: item.jumlahResponden,
  }));

  return (
    <div className="min-h-screen p-lg space-y-lg relative">
      <KabDashboardHeader summary={summary} />

      <KabFilterScopeNote periode={periode} jenisLayanan={jenisLayanan} />

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
            <IkmLeaderboard data={leaderboardData} periode={periode} />
          </div>
        </div>
        <div className="w-full overflow-x-auto hide-scrollbar">
          <div className="min-w-[300px]">
            <ComplaintStatusDonut data={statistics.complaintStatus} />
          </div>
        </div>
      </div>

      {/* Disembunyikan untuk Admin Kabupaten biasa -- log aktivitas superuser saja. */}
      {activities && <RecentActivities data={activities} />}
    </div>
  );
}
