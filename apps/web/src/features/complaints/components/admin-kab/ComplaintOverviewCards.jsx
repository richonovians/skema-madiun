import React, { useMemo } from 'react';
import StatCard from '@/components/ui/StatCard';
import { 
  FileText, 
  AlertCircle, 
  Clock, 
  CheckCircle2, 
  CalendarPlus, 
  Building2 
} from 'lucide-react';

export default function ComplaintOverviewCards({ complaints }) {
  const stats = useMemo(() => {
    const total = complaints.length;
    
    // Asumsikan "hari ini" adalah tanggal terbaru di data dummy (22 Juli 2026) untuk simulasi
    // Di produksi, kita akan pakai tanggal asli
    const todayComplaints = complaints.filter(c => c.ageDays <= 1).length;
    
    const processing = complaints.filter(c => c.status === 'Diproses').length;
    const completed = complaints.filter(c => c.status === 'Selesai').length;
    
    const overdue = complaints.filter(c => c.sla?.isOverdue).length;

    // Hitung OPD terbanyak
    const opdCounts = {};
    complaints.forEach(c => {
      if (c.opd) {
        opdCounts[c.opd.name] = (opdCounts[c.opd.name] || 0) + 1;
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

    return {
      total,
      todayComplaints,
      processing,
      completed,
      overdue,
      topOpd,
      maxCount
    };
  }, [complaints]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-md mb-xl">
      <StatCard 
        title="Total Pengaduan" 
        value={stats.total} 
        icon={FileText} 
        trendType="neutral"
      />
      
      <StatCard 
        title="Pengaduan Baru" 
        value={stats.todayComplaints} 
        icon={CalendarPlus} 
        trendType="positive"
        trend="Hari Ini"
      />

      <StatCard 
        title="Sedang Diproses" 
        value={stats.processing} 
        icon={Clock} 
        trendType="neutral"
      />

      <StatCard 
        title="Sudah Selesai" 
        value={stats.completed} 
        icon={CheckCircle2} 
        trendType="positive"
      />

      <StatCard 
        title="Melebihi SLA" 
        value={stats.overdue} 
        icon={AlertCircle} 
        trendType={stats.overdue > 0 ? "negative" : "positive"}
      />

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
