import React, { useMemo } from 'react';
import StatCard from '@/components/ui/StatCard';
import { FileText, Clock, CheckCircle2, CalendarPlus, Building2 } from 'lucide-react';

/**
 * Kartu "Melebihi SLA" DIHAPUS -- backend tak punya konsep target/tenggat SLA
 * sama sekali (lihat catatan gap complaint.adapter.js sejak INT-6: sla{...}
 * di dummy lama 100% karangan). 5 kartu tersisa SEMUA dihitung dari field
 * yang benar-benar ada (status, ageDays, target=opdNama).
 */
export default function ComplaintOverviewCards({ complaints }) {
  const stats = useMemo(() => {
    const total = complaints.length;
    const todayComplaints = complaints.filter((c) => c.ageDays <= 1).length;
    const processing = complaints.filter((c) => c.status === 'Diproses').length;
    const completed = complaints.filter((c) => c.status === 'Selesai').length;

    const opdCounts = {};
    complaints.forEach((c) => {
      if (c.target) {
        opdCounts[c.target] = (opdCounts[c.target] || 0) + 1;
      }
    });

    let topOpd = 'Belum ada data';
    let maxCount = 0;
    Object.entries(opdCounts).forEach(([name, count]) => {
      if (count > maxCount) {
        topOpd = name;
        maxCount = count;
      }
    });

    return { total, todayComplaints, processing, completed, topOpd, maxCount };
  }, [complaints]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-md mb-xl">
      <StatCard title="Total Pengaduan" value={stats.total} icon={FileText} trendType="neutral" />

      <StatCard
        title="Pengaduan Baru"
        value={stats.todayComplaints}
        icon={CalendarPlus}
        trendType="positive"
        trend="Hari Ini"
      />

      <StatCard title="Sedang Diproses" value={stats.processing} icon={Clock} trendType="neutral" />

      <StatCard title="Sudah Selesai" value={stats.completed} icon={CheckCircle2} trendType="positive" />

      <StatCard
        title="OPD Terbanyak"
        value={stats.maxCount}
        badge={stats.topOpd}
        icon={Building2}
        trendType="neutral"
      />
    </div>
  );
}
