/**
 * Terjemahkan StatisticsEntity backend (GET /statistics, INT-14, PUBLIK) ke
 * bentuk yang dipakai StatisticsDashboard.jsx & komponennya. Satu tempat --
 * perubahan kontrak backend cukup diubah di sini (INT-6).
 *
 * CATATAN: backend juga mengembalikan `summary`/`ikmTrend`/`complaintTrend`/
 * `serviceElements`/`valueDistribution` (kapasitas penuh sesuai analisis
 * roadmap §2.5a), tapi halaman /statistics SAAT INI hanya merender insight+
 * complaintCategories+topOpd (StatisticsDashboard.jsx) -- field lain BELUM
 * py slot UI, bukan gap wiring (tak ada yg perlu disambungkan krn tak ada
 * konsumennya). Adapter ini sengaja hanya menerjemahkan yg benar-benar dipakai.
 */
export function adaptStatistics(statistics) {
  return {
    insight: {
      text: statistics.insight.text ?? 'Belum ada narasi analisis dari Admin Kabupaten.',
    },
    complaintCategories: statistics.complaintCategories.map((c) => ({
      category: c.nama,
      count: c.count,
    })),
    topOpd: statistics.topOpd.map((o) => ({
      rank: o.peringkat,
      name: o.opdNama,
      ikm: o.nilaiIkm,
      medal: MEDAL_BY_RANK[o.peringkat] ?? '',
    })),
  };
}

const MEDAL_BY_RANK = { 1: '🥇', 2: '🥈', 3: '🥉' };
