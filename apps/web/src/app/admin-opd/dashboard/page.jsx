'use client';

import React, { useCallback } from 'react';
import DashboardSummary from '@/features/dashboards/components/DashboardSummary';
import TrendChart from '@/features/statistics/components/charts/TrendChart';
import PerformanceMetrics from '@/features/dashboards/components/PerformanceMetrics';
import RecentFeedback from '@/features/dashboards/components/RecentFeedback';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getOpdDashboard } from '@/features/dashboards/services/dashboardOpd.api';

/**
 * INT-12: sebelumnya 100% dummy (setTimeout + data hardcode). Kini pakai
 * GET /dashboard/opd sungguhan -- lihat opdDashboard.adapter.js utk
 * penjelasan tiap field (termasuk gap D4: recentFeedback tanpa identitas).
 */
export default function AdminDashboardPage() {
  const fetchDashboard = useCallback(() => getOpdDashboard(), []);
  const { data, isLoading, error, refetch } = useAsync(fetchDashboard);

  if (isLoading) {
    return <LoadingState label="Memuat dashboard..." />;
  }

  if (error) {
    return <ErrorState title="Gagal memuat dashboard" description={error.message} onRetry={refetch} />;
  }

  const ikmTrendData = data.ikmTrend.map((p) => ({ month: p.periode, nilaiIkm: p.nilaiIkm }));

  return (
    <>
      <DashboardSummary summaryData={data.summary} />

      {ikmTrendData.length > 0 && (
        <TrendChart data={ikmTrendData} title="Tren Nilai IKM per Triwulan" dataKey="nilaiIkm" yMin={0} yMax={100} />
      )}

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <PerformanceMetrics metrics={data.performanceMetrics} />
        <RecentFeedback feedbacks={data.recentFeedback} />
      </section>
    </>
  );
}
