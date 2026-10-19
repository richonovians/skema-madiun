import React from 'react';
import StatCard from '@/components/ui/StatCard';
import { BarChart, Users, Ticket, Timer, UserCheck } from 'lucide-react';

/**
 * Lima kartu ringkasan Admin OPD. Angkanya KUMULATIF seluruh periode --
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

  // `null` DIBEDAKAN dari 0. Nol adalah pernyataan -- "tak ada akun aktif di
  // OPD ini" -- sedangkan medan yang tak terkirim berarti kita belum tahu.
  const { activeOpdUsers } = summaryData;
  const akunAktif = activeOpdUsers == null ? '-' : activeOpdUsers.toLocaleString('id-ID');

  return (
    // LIMA kolom sejak kartu "Akun Aktif" bergabung (15 September 2026,
    // permintaan pengguna). Pada lebar dua kolom kartu terakhir memang berdiri
    // sendirian di baris penutup; itu tak terhindarkan dengan jumlah ganjil, dan
    // yang sendirian adalah kartu yang paling belakang urutannya.
    <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-lg">
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

      {/* Lingkupnya ikut tertulis, dan itu bukan kerapian: yang dihitung adalah
          AKUN admin yang tertaut OPD ini, biasanya satu atau dua orang,
          sementara tetangganya sebaris menghitung warga dan tiket. Tanpa
          keterangan itu angka 1 di samping "Total Responden 1" terbaca sebagai
          "cuma satu warga yang dilayani". */}
      <StatCard
        title="Akun Aktif"
        value={akunAktif}
        trend="Akun admin tertaut OPD ini"
        trendType="neutral"
        icon={UserCheck}
      />
    </section>
  );
}
