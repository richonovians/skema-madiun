import React, { useMemo } from 'react';
import StatCard from '@/components/ui/StatCard';
import { ClipboardList, PlayCircle, FileEdit, Users, TrendingUp } from 'lucide-react';

/**
 * Ringkasan monitoring survei lintas OPD. SEMUA angka dihitung dari field yang
 * benar-benar dikirim GET /surveys (status, respondentsCount, nilaiIkm -- lihat
 * adaptSurvey di survey.adapter.js), bukan metrik karangan.
 *
 * Rata-rata IKM hanya merata-ratakan survei yang SUDAH punya nilai
 * (`ikmScore != null`) -- survei draf/belum ada responden tak ikut dihitung
 * supaya tak menarik rata-rata ke bawah secara menyesatkan.
 */
export default function SurveyOverviewCards({ surveys }) {
  const stats = useMemo(() => {
    const total = surveys.length;
    const active = surveys.filter((s) => s.status === 'AKTIF').length;
    const draft = surveys.filter((s) => s.status === 'DRAF').length;
    const totalRespondents = surveys.reduce((sum, s) => sum + (s.respondentsCount ?? 0), 0);

    const scored = surveys.filter((s) => s.ikmScore != null);
    const averageIkm =
      scored.length > 0 ? scored.reduce((sum, s) => sum + s.ikmScore, 0) / scored.length : null;

    const opdCount = new Set(surveys.map((s) => s.opdId).filter((id) => id != null)).size;

    return { total, active, draft, totalRespondents, averageIkm, scored: scored.length, opdCount };
  }, [surveys]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-md mb-xl">
      <StatCard
        title="Total Survei"
        value={stats.total}
        icon={ClipboardList}
        trendType="neutral"
        badge={`${stats.opdCount} OPD`}
      />

      <StatCard title="Survei Aktif" value={stats.active} icon={PlayCircle} trendType="positive" />

      <StatCard title="Masih Draf" value={stats.draft} icon={FileEdit} trendType="neutral" />

      <StatCard
        title="Total Responden"
        value={stats.totalRespondents.toLocaleString('id-ID')}
        icon={Users}
        trendType="neutral"
      />

      <StatCard
        title="Rata-rata Nilai IKM"
        value={stats.averageIkm != null ? stats.averageIkm.toFixed(2) : '-'}
        icon={TrendingUp}
        trendType={stats.averageIkm != null ? 'positive' : 'neutral'}
        trend={
          stats.averageIkm != null
            ? `Dari ${stats.scored} survei bernilai`
            : 'Belum ada survei bernilai'
        }
      />
    </div>
  );
}
