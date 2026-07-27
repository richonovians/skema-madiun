export const dummyStatisticsResponse = {
  summary: {
    ikm: 86.4,
    totalRespondents: 12450,
    totalComplaints: 843,
    completionRate: 92,
    avgSlaDays: 2.4,
    activeOpd: 48
  },
  insight: {
    text: "Capaian pelayanan publik Kabupaten Madiun mengalami peningkatan sebesar 4,8% dibanding periode sebelumnya, ditopang oleh percepatan SLA pengaduan infrastruktur dan inovasi digitalisasi."
  },
  ikmTrend: [
    { month: 'Jan', value: 81.2 },
    { month: 'Feb', value: 82.5 },
    { month: 'Mar', value: 82.0 },
    { month: 'Apr', value: 84.3 },
    { month: 'Mei', value: 85.1 },
    { month: 'Jun', value: 86.4 }
  ],
  complaintTrend: [
    { month: 'Jan', count: 120 },
    { month: 'Feb', count: 98 },
    { month: 'Mar', count: 145 },
    { month: 'Apr', count: 110 },
    { month: 'Mei', count: 180 },
    { month: 'Jun', count: 190 }
  ],
  complaintStatus: [
    { status: 'Selesai', count: 775, color: '#10b981' }, // green-500
    { status: 'Diproses', count: 45, color: '#f59e0b' }, // amber-500
    { status: 'Baru', count: 18, color: '#3b82f6' }, // blue-500
    { status: 'Ditolak', count: 5, color: '#ef4444' } // red-500
  ],
  serviceElements: [
    { name: 'Kesesuaian Persyaratan', score: 88.5 },
    { name: 'Kemudahan Prosedur', score: 85.2 },
    { name: 'Kecepatan Waktu', score: 82.0 },
    { name: 'Kewajaran Biaya', score: 95.0 },
    { name: 'Kualitas Produk', score: 86.8 },
    { name: 'Kompetensi Petugas', score: 87.5 },
    { name: 'Kesopanan Petugas', score: 89.1 },
    { name: 'Kualitas Sarpras', score: 84.4 },
    { name: 'Penanganan Pengaduan', score: 83.2 }
  ],
  valueDistribution: [
    { label: 'Sangat Baik', percentage: 52 },
    { label: 'Baik', percentage: 38 },
    { label: 'Kurang', percentage: 8 },
    { label: 'Buruk', percentage: 2 }
  ],
  complaintCategories: [
    { category: 'Infrastruktur', count: 320 },
    { category: 'Administrasi', count: 215 },
    { category: 'Perizinan', count: 145 },
    { category: 'Kesehatan', count: 98 },
    { category: 'Pendidikan', count: 65 }
  ],
  topOpd: [
    { rank: 1, name: 'Dinas Kependudukan dan Pencatatan Sipil', ikm: 96.2, medal: '🥇' },
    { rank: 2, name: 'Dinas Penanaman Modal dan PTSP', ikm: 94.8, medal: '🥈' },
    { rank: 3, name: 'Dinas Kesehatan (Puskesmas)', ikm: 93.5, medal: '🥉' },
    { rank: 4, name: 'Dinas Pendidikan dan Kebudayaan', ikm: 91.0, medal: '' },
    { rank: 5, name: 'Badan Pendapatan Daerah', ikm: 89.5, medal: '' }
  ]
};
