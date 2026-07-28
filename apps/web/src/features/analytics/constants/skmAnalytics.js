export const skmMetrics = {
  ikm: {
    value: 84.20,
    trend: "+2.10 vs Q1",
    status: "positive"
  },
  totalRespondents: {
    value: "2,450",
    badge: "100% Target"
  },
  quality: {
    grade: "A - Sangat Baik"
  }
};

export const skmServiceElements = [
  { code: 'U1', name: 'Persyaratan', nrr: 3.45, weighted: 0.38, status: 'Sangat Baik', trend: 'up' },
  { code: 'U2', name: 'Prosedur', nrr: 3.40, weighted: 0.37, status: 'Sangat Baik', trend: 'up' },
  { code: 'U3', name: 'Waktu Pelayanan', nrr: 3.20, weighted: 0.35, status: 'Baik', trend: 'down' },
  { code: 'U4', name: 'Biaya/Tarif', nrr: 3.80, weighted: 0.42, status: 'Sangat Baik', trend: 'neutral' },
  { code: 'U5', name: 'Produk Layanan', nrr: 3.50, weighted: 0.39, status: 'Sangat Baik', trend: 'up' },
  { code: 'U6', name: 'Kompetensi Pelaksana', nrr: 3.35, weighted: 0.37, status: 'Baik', trend: 'up' },
  { code: 'U7', name: 'Perilaku Pelaksana', nrr: 3.65, weighted: 0.40, status: 'Sangat Baik', trend: 'up' },
  { code: 'U8', name: 'Sarana Prasarana', nrr: 3.10, weighted: 0.34, status: 'Baik', trend: 'down' },
  { code: 'U9', name: 'Penanganan Pengaduan', nrr: 3.25, weighted: 0.36, status: 'Baik', trend: 'up' },
];

export const skmDistribution = [
  { code: 'U1', name: 'Persyaratan', total: 2450, distribution: { veryBad: 5, bad: 10, good: 35, veryGood: 50 } },
  { code: 'U2', name: 'Prosedur', total: 2450, distribution: { veryBad: 2, bad: 8, good: 40, veryGood: 50 } },
  { code: 'U3', name: 'Waktu', total: 2450, distribution: { veryBad: 15, bad: 20, good: 45, veryGood: 20 } },
  { code: 'U4', name: 'Sarana', total: 2450, distribution: { veryBad: 3, bad: 12, good: 35, veryGood: 50 } },
];

export const skmYearlyTrend = [
  { year: 2024, value: 78.5 },
  { year: 2025, value: 82.1 },
  { year: 2026, value: 84.2 },
];
