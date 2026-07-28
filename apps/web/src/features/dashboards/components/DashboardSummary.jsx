import React from 'react';
import StatCard from '@/components/ui/StatCard';
import { BarChart, Users, Ticket, Timer } from 'lucide-react';

export default function DashboardSummary({ summaryData }) {
  // If no data is provided, we can render a loading state or nothing
  if (!summaryData) return null;

  return (
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
      <StatCard 
        title="Skor IKM"
        value={summaryData.ikmScore}
        badge={`Mutu: ${summaryData.ikmGrade}`}
        icon={BarChart}
      />
      
      <StatCard 
        title="Total Responden"
        value={summaryData.totalRespondents}
        trend={summaryData.respondentTrend}
        trendType="positive"
        icon={Users}
      />
      
      <StatCard 
        title="Tiket Aktif"
        value={summaryData.activeTickets}
        trend="Membutuhkan tindak lanjut"
        trendType="neutral"
        icon={Ticket}
      />
      
      <StatCard 
        title="Rata-rata Respon"
        value={summaryData.avgResponseTime}
        trend={`Sesuai target SLA (${summaryData.slaTarget})`}
        trendType="neutral"
        icon={Timer}
      />
    </section>
  );
}
