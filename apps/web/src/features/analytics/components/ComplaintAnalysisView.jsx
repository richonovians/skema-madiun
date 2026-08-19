'use client';

import React, { useEffect, useState } from 'react';
import EmptyState from '@/components/ui/EmptyState';
import { BarChart3 } from 'lucide-react';

const CATEGORY_COLORS = [
  '#2563EB', '#943700', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4',
];

/**
 * Tab Analisis Pengaduan — sebelumnya 100% dummy (import complaintAnalytics.js),
 * kini menerima props data nyata dari parent (analytics/page.jsx).
 *
 * `categories`: distribusi kategori pengaduan [{name, count}] — dihitung di
 *   parent dari data GET /complaints mentah (groupBy kategori client-side).
 * `totalComplaints`: total pengaduan.
 * `resolutionStats`: {averageDays, successRate, openTickets} — dari GET /dashboard/opd.
 * `volumeMonthly`: [{month, received, completed}] — dihitung di parent dari
 *   data GET /complaints mentah (groupBy bulan client-side).
 *
 * CATATAN GAP: panel "Resolusi SLA per Prioritas" dihapus total — backend
 * TIDAK punya konsep prioritas (High/Medium/Low) pada pengaduan sama sekali.
 * Konstanta dummy lamanya (complaintAnalytics.js, kini sudah dihapus) mengarang 98.2%/85.5%/92.0% per
 * priority tier — angka ini tak punya sumber nyata di mana pun.
 */
export default function ComplaintAnalysisView({
  categories = [],
  totalComplaints = 0,
  resolutionStats = null,
  volumeMonthly = [],
}) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  if (totalComplaints === 0 && !resolutionStats) {
    return (
      <EmptyState
        icon={<BarChart3 size={48} />}
        title="Belum ada data pengaduan"
        description="Analisis pengaduan akan muncul setelah ada pengaduan masuk ke OPD Anda."
      />
    );
  }

  // Hitung persentase per kategori
  const categoriesWithPercent = categories.map((cat, idx) => ({
    ...cat,
    percentage: totalComplaints > 0 ? Math.round((cat.count / totalComplaints) * 100) : 0,
    color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
  }));

  // Hitung cumulative offset untuk donut chart
  const cumulativeOffsets = categoriesWithPercent.reduce((acc, cat, idx) => {
    if (idx === 0) return [0];
    return [...acc, acc[idx - 1] + categoriesWithPercent[idx - 1].percentage];
  }, [0]);

  return (
    <section className="space-y-xl animate-in fade-in duration-500">
      {/* Row 1: Donut Kategori & Stats Resolusi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        {/* Donut chart kategori */}
        <div className="bg-white/95 backdrop-blur border border-border rounded-xl p-lg shadow-sm">
          <h3 className="font-h3 text-h3 text-primary mb-lg">Kategori Pengaduan Terbanyak</h3>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-xl">
            <div className="relative w-48 h-48 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" fill="transparent" r="16" stroke="#E2E8F0" strokeWidth="4"></circle>
                {categoriesWithPercent.slice(0, 5).map((cat, idx) => (
                  <circle
                    key={cat.name}
                    cx="18" cy="18" fill="transparent" r="16"
                    stroke={cat.color}
                    strokeDasharray={`${animate ? cat.percentage : 0} 100`}
                    strokeDashoffset={`-${cumulativeOffsets[idx]}`}
                    strokeWidth="4"
                    className="transition-all duration-1000 ease-out"
                    style={{ transitionDelay: `${idx * 200}ms` }}
                  ></circle>
                ))}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-headline-md font-bold text-primary">{totalComplaints}</span>
                <span className="text-[10px] text-secondary">Total Aduan</span>
              </div>
            </div>
            <div className="flex-1 space-y-md w-full">
              {categoriesWithPercent.map((cat) => (
                <div key={cat.name} className="flex justify-between items-center text-label-md">
                  <span className="flex items-center gap-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }}></div>
                    {cat.name}
                  </span>
                  <span className="font-bold">{cat.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Gap notice: SLA per prioritas dihapus */}
        <div className="bg-white/95 backdrop-blur border border-border rounded-xl p-lg shadow-sm">
          <h3 className="font-h3 text-h3 text-primary mb-lg">Distribusi Status</h3>
          {categories.length === 0 ? (
            <p className="text-text-secondary text-sm">Belum ada data kategori.</p>
          ) : (
            <div className="space-y-lg">
              {categoriesWithPercent.map((cat, idx) => (
                <div key={cat.name} className="space-y-xs">
                  <div className="flex justify-between text-label-md">
                    <span className="font-bold text-text-primary">{cat.name}</span>
                    <span className="text-secondary">{cat.count} pengaduan</span>
                  </div>
                  <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000 ease-out"
                      style={{
                        width: animate ? `${cat.percentage}%` : '0%',
                        backgroundColor: cat.color,
                        transitionDelay: `${idx * 200}ms`,
                      }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Deep Metrics: Volume & Duration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        {/* Volume chart bulanan */}
        <div className="lg:col-span-2 bg-white/95 backdrop-blur border border-border rounded-xl p-lg shadow-sm">
          <h3 className="font-h3 text-h3 text-primary mb-lg">Volume Pengaduan Bulanan</h3>
          {volumeMonthly.length === 0 ? (
            <p className="text-text-secondary text-sm py-12 text-center">Belum ada data bulanan.</p>
          ) : (
            <>
              <div className="flex items-end gap-md h-48 pt-lg">
                {volumeMonthly.map((vol, idx) => {
                  const maxVal = Math.max(...volumeMonthly.map(v => v.received), 1);
                  const receivedHeight = (vol.received / maxVal) * 100;
                  const completedHeight = vol.received > 0 ? (vol.completed / vol.received) * 100 : 0;

                  return (
                    <div key={vol.month} className="flex-1 flex flex-col items-center gap-xs h-full justify-end">
                      <div
                        className="w-full bg-primary-container/20 rounded-t-lg relative transition-all duration-1000 origin-bottom"
                        style={{ height: animate ? `${receivedHeight}%` : '0%', transitionDelay: `${idx * 100}ms` }}
                      >
                        <div
                          className="absolute inset-x-0 bottom-0 bg-primary rounded-t-lg transition-all duration-1000"
                          style={{ height: animate ? `${completedHeight}%` : '0%', transitionDelay: `${(idx * 100) + 500}ms` }}
                        ></div>
                      </div>
                      <span className="text-[10px] text-secondary font-bold">{vol.month}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-md flex justify-center gap-xl text-label-md">
                <span className="flex items-center gap-xs"><div className="w-3 h-3 bg-primary rounded"></div> Selesai</span>
                <span className="flex items-center gap-xs"><div className="w-3 h-3 bg-primary-container/20 rounded"></div> Masuk</span>
              </div>
            </>
          )}
        </div>

        {/* Rata-rata penyelesaian */}
        <div className="bg-inverse-surface border border-border rounded-xl p-lg shadow-sm text-on-primary flex flex-col justify-center">
          <h3 className="font-h3 text-h3 text-primary-fixed mb-lg text-center">Rata-Rata Penyelesaian</h3>
          <div className="space-y-xl">
            <div className="text-center">
              <span className="text-headline-xl font-extrabold text-white">
                {resolutionStats?.averageHours != null
                  ? resolutionStats.averageHours < 24
                    ? `${resolutionStats.averageHours}`
                    : `${Math.round(resolutionStats.averageHours / 24)}`
                  : '-'}
              </span>
              <span className="text-headline-md font-medium text-primary-fixed ml-xs">
                {resolutionStats?.averageHours != null && resolutionStats.averageHours < 24 ? 'Jam' : 'Hari'}
              </span>
              <p className="text-label-md text-outline-variant mt-xs">Waktu rata-rata tindak lanjut</p>
            </div>
            <div className="grid grid-cols-2 gap-md pt-lg border-t border-on-surface-variant/30">
              <div className="text-center">
                <span className="block font-bold text-headline-md text-green-400">
                  {resolutionStats?.completionRate != null ? `${resolutionStats.completionRate}%` : '-'}
                </span>
                <span className="text-[10px] text-outline-variant uppercase">Completion Rate</span>
              </div>
              <div className="text-center">
                <span className="block font-bold text-headline-md text-blue-400">
                  {resolutionStats?.openTickets ?? '-'}
                </span>
                <span className="text-[10px] text-outline-variant uppercase">Open Tickets</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
