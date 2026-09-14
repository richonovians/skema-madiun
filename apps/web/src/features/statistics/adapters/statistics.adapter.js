import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

/**
 * Terjemahkan StatisticsEntity backend (GET /statistics, INT-14, PUBLIK) ke
 * bentuk yang dipakai StatisticsDashboard.jsx & komponennya. Satu tempat --
 * perubahan kontrak backend cukup diubah di sini (INT-6).
 *
 * `summary`/`ikmTrend`/`serviceElements`/`valueDistribution`/`complaintStatus`
 * (2026-08-05, INT-24) kini JUGA diterjemahkan -- dipakai ulang oleh
 * `/admin-kab/dashboard` (bento grid ringkasan kinerja), bukan cuma
 * `/statistics` publik. Satu endpoint publik, dua konsumen (wajar -- admin
 * yg login pun boleh baca data publik).
 */
export function adaptStatistics(statistics) {
  return {
    summary: statistics.summary,
    insight: {
      text: statistics.insight.text ?? 'Belum ada narasi analisis dari Admin Kabupaten.',
    },
    ikmTrend: statistics.ikmTrend.map((p) => ({ month: formatPeriodeLabel(p.periode), value: p.value })),
    complaintCategories: statistics.complaintCategories.map((c) => ({
      category: c.nama,
      count: c.count,
    })),
    complaintStatus: adaptComplaintStatus(statistics.complaintStatus),
    serviceElements: statistics.serviceElements.map((s) => ({
      name: s.name,
      score: Math.round(s.avgNrr * 25 * 100) / 100, // NRR (1-4) -> skala 0-100, konsisten rumus IkmService
    })),
    valueDistribution: adaptValueDistribution(statistics.valueDistribution),
    topOpd: statistics.topOpd.map((o) => ({
      rank: o.peringkat,
      name: o.opdNama,
      ikm: o.nilaiIkm,
      medal: MEDAL_BY_RANK[o.peringkat] ?? '',
    })),
  };
}

const MEDAL_BY_RANK = { 1: '🥇', 2: '🥈', 3: '🥉' };

const STATUS_META = {
  diterima: { label: 'Baru', color: '#3b82f6' },
  diproses: { label: 'Diproses', color: '#f59e0b' },
  selesai: { label: 'Selesai', color: '#10b981' },
  ditolak: { label: 'Ditolak', color: '#ef4444' },
};

/** `{status,count}[]` backend -> `{total, status:[{id,label,percentage,color}]}` (ComplaintStatusDonut.jsx). */
function adaptComplaintStatus(rows) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return {
    total,
    status: rows.map((r) => ({
      id: r.status,
      label: STATUS_META[r.status]?.label ?? r.status,
      // `count` ikut dibawa sejak 14 September 2026. Sebelumnya hanya
      // persentasenya yang selamat, sehingga pemakai yang butuh jumlahnya
      // terpaksa menghitung mundur dari persen -- dan hasilnya meleset begitu
      // pembulatannya bergeser (31% dari 13 memberi 4,03, bukan 4).
      count: r.count,
      percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
      color: STATUS_META[r.status]?.color ?? '#94a3b8',
    })),
  };
}

const VALUE_LABEL = { 1: 'Buruk', 2: 'Kurang', 3: 'Baik', 4: 'Sangat Baik' };

/** `{value:1-4,count}[]` backend -> `{label,percentage}[]` (BarChart.jsx). */
function adaptValueDistribution(rows) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return rows.map((r) => ({
    label: VALUE_LABEL[r.value] ?? `Nilai ${r.value}`,
    percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
  }));
}
