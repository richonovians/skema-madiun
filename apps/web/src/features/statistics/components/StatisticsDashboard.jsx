'use client';

import React, { useCallback } from 'react';
import InsightCard from './InsightCard';
import TopOpdRanking from './TopOpdRanking';
import BarChart from './charts/BarChart';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getStatistics } from '../services/statistics.api';

/** INT-14: sebelumnya 100% dummy statis. Kini pakai GET /statistics publik sungguhan (D2, tanpa login). */
export default function StatisticsDashboard() {
  const fetchStatistics = useCallback(() => getStatistics(), []);
  const { data, isLoading, error, refetch } = useAsync(fetchStatistics);

  if (isLoading) {
    return <LoadingState label="Memuat statistik..." />;
  }

  if (error) {
    return <ErrorState title="Gagal memuat statistik" description={error.message} onRetry={refetch} />;
  }

  const { insight, complaintCategories, topOpd } = data;

  return (
    <div className="bg-background py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
        {/* Insight Section */}
        <section>
          <InsightCard text={insight.text} />
        </section>

        {/* Visualisasi Pengaduan & Top OPD */}
        <section className="mt-4">
          <div className="mb-6 border-b border-border pb-2">
            <h2 className="text-2xl font-bold text-text-primary">Statistik Pengaduan & Peringkat Instansi</h2>
            <p className="text-text-secondary">Analisis kategori pengaduan terbanyak dan peringkat OPD dalam penanganan laporan.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kategori Terbanyak */}
            <div className="w-full">
              {complaintCategories.length > 0 ? (
                <BarChart title="Top Kategori Pengaduan" data={complaintCategories} />
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm text-sm text-text-secondary">
                  Belum ada data pengaduan.
                </div>
              )}
            </div>

            {/* Top OPD */}
            <div className="w-full h-full">
              {topOpd.length > 0 ? (
                <TopOpdRanking data={topOpd} />
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm text-sm text-text-secondary">
                  Belum ada hasil IKM yang tercatat.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
