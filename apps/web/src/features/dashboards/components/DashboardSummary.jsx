import React from 'react';
import StatCard from '@/components/ui/StatCard';
import { BarChart, Users, Ticket, Timer } from 'lucide-react';

/**
 * Empat kartu ringkasan Admin OPD. Angkanya KUMULATIF seluruh periode --
 * `GET /dashboard/opd` tak menerima parameter periode (lihat catatan di
 * OpdDashboardHeader.jsx), jadi jangan disangka mengikuti penyaring triwulan.
 *
 * Arah tren & kepatuhan SLA DITURUNKAN dari nilai mentahnya, bukan dipatok.
 * SEBELUMNYA kartu "Rata-rata Respon" selalu berbunyi "Sesuai target SLA"
 * apa pun realisasinya -- termasuk saat rata-ratanya justru melewati target --
 * dan kartu responden selalu hijau/panah-naik walau persentasenya minus.
 */
export default function DashboardSummary({ summaryData }) {
  if (!summaryData) return null;

  const trendPercent = summaryData.respondentTrendPercent;
  const respondentTrendType =
    trendPercent == null ? 'neutral' : trendPercent > 0 ? 'positive' : trendPercent < 0 ? 'negative' : 'neutral';

  const { avgResponseHours, slaTargetHours } = summaryData;
  const isSlaMet = avgResponseHours != null && slaTargetHours != null && avgResponseHours <= slaTargetHours;
  const slaTrend =
    avgResponseHours == null
      ? 'Belum ada pengaduan selesai sebagai dasar hitung'
      : isSlaMet
        ? `Sesuai target SLA (${summaryData.slaTarget})`
        : `Melewati target SLA (${summaryData.slaTarget})`;

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
        trendType={respondentTrendType}
        icon={Users}
      />

      <StatCard
        title="Tiket Aktif"
        value={summaryData.activeTickets}
        trend={
          summaryData.activeTickets > 0
            ? 'Membutuhkan tindak lanjut'
            : 'Tidak ada yang menunggu tindak lanjut'
        }
        trendType="neutral"
        icon={Ticket}
      />

      <StatCard
        title="Rata-rata Respon"
        value={summaryData.avgResponseTime}
        trend={slaTrend}
        trendType={avgResponseHours == null ? 'neutral' : isSlaMet ? 'positive' : 'negative'}
        icon={Timer}
      />
    </section>
  );
}
