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
    ikmTrend: statistics.ikmTrend.map((p) => ({ month: formatPeriodeLabel(p.periode), value: p.value })),
    complaintCategories: statistics.complaintCategories.map((c) => ({
      category: c.nama,
      count: c.count,
    })),
    complaintStatus: adaptComplaintStatus(statistics.complaintStatus),
    // Dua tampilan dari SATU deret bulanan backend (2 November 2026), supaya
    // angka bulanan dan tahunan tak pernah berselisih. `?? []`: deret kosong
    // berarti belum ada pengaduan, bukan nilai yang dikarang.
    complaintTrendBulanan: (statistics.complaintTrendBulanan ?? [])
      .slice(-BULAN_DITAMPILKAN)
      .map((p) => ({ month: labelBulan(p.periode), value: p.value })),
    complaintTrendTahunan: jumlahPerTahun(statistics.complaintTrendBulanan ?? []),
    // `groupBy` backend tak membuat baris untuk status bernilai nol, jadi
    // tanpa baris `selesai` jumlahnya memang 0.
    completedComplaints:
      statistics.complaintStatus.find((r) => r.status === 'selesai')?.count ?? 0,
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

/** Tampilan Bulanan halaman statistik: dua belas bulan terakhir. */
const BULAN_DITAMPILKAN = 12;

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

/** "2026-11" -> "Nov 2026". Periode yang tak dikenal ditampilkan apa adanya. */
function labelBulan(periode) {
  const cocok = /^(\d{4})-(\d{2})$/.exec(periode ?? '');
  if (!cocok) return periode;
  return `${NAMA_BULAN[Number(cocok[2]) - 1]} ${cocok[1]}`;
}

/** Deret `{periode:"YYYY-MM", value}` -> `{month:"YYYY", value}` per tahun, terurut. */
function jumlahPerTahun(deret) {
  const perTahun = new Map();
  for (const p of deret) {
    const tahun = String(p.periode).slice(0, 4);
    perTahun.set(tahun, (perTahun.get(tahun) ?? 0) + p.value);
  }
  return [...perTahun.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([tahun, value]) => ({ month: tahun, value }));
}

const MEDAL_BY_RANK = { 1: '🥇', 2: '🥈', 3: '🥉' };

/**
 * Warnanya SAMA dengan `STATUS` di analitik.adapter.js, supaya satu status tak
 * berganti rupa antara halaman publik dan halaman analitik.
 *
 * `terkirim` tak ada di sini: ia tak pernah menjadi status berjalan, jadi
 * `groupBy status` backend tak akan pernah mengembalikannya.
 */
const STATUS_META = {
  menunggu_verifikasi: { label: 'Menunggu Verifikasi', color: '#4493CC' },
  diverifikasi: { label: 'Diverifikasi', color: '#6366f1' },
  sedang_ditindaklanjuti: { label: 'Sedang Ditindaklanjuti', color: '#f59e0b' },
  perlu_perbaikan: { label: 'Perlu Perbaikan', color: '#f97316' },
  // Biru langit, sewarna lencananya di enumLabels.js: tiketnya berpindah ke
  // instansi lain, bukan menunggu pelapor.
  dialihkan: { label: 'Dialihkan', color: '#0ea5e9' },
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

// Diekspor (8 Oktober 2026): kartu Distribusi Skor di Statistik & Laporan memakai
// label yang sama, supaya "Kurang" tak berganti kata antara halaman publik dan
// halaman admin.
export const VALUE_LABEL = { 1: 'Buruk', 2: 'Kurang', 3: 'Baik', 4: 'Sangat Baik' };

/** `{value:1-4,count}[]` backend -> `{label,percentage}[]` (BarChart.jsx). */
function adaptValueDistribution(rows) {
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return rows.map((r) => ({
    label: VALUE_LABEL[r.value] ?? `Nilai ${r.value}`,
    percentage: total > 0 ? Math.round((r.count / total) * 100) : 0,
  }));
}
