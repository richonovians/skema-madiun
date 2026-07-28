export const fetchSummaryMetrics = (year, service) => {
  // Simulate API response
  return {
    ikmScore: 82.40,
    ikmGrade: 'B',
    ikmLabel: 'Baik',
    totalRespondents: 12450,
    openComplaints: 34,
    newComplaints: 2,
    systemActivityPercent: 100
  };
};

export const fetchIkmLeaderboard = (year, service) => {
  // Simulate API response
  return [
    { opdId: 'opd-1', opdName: 'Dinas Kesehatan', ikmScore: 88.2, respondents: 2100, trend: 'up' },
    { opdId: 'opd-2', opdName: 'RSUD Madiun', ikmScore: 86.5, respondents: 3400, trend: 'up' },
    { opdId: 'opd-3', opdName: 'DPMPTSP', ikmScore: 84.0, respondents: 1850, trend: 'stable' },
    { opdId: 'opd-4', opdName: 'Dinas Pendidikan', ikmScore: 82.1, respondents: 4200, trend: 'down' },
    { opdId: 'opd-5', opdName: 'Dispendukcapil', ikmScore: 79.5, respondents: 5600, trend: 'down' }
  ];
};

export const fetchComplaintDistribution = (year, service) => {
  // Simulate API response
  return {
    total: 34,
    status: [
      { id: 'selesai', label: 'Selesai', percentage: 75, color: '#2563EB' }, // blue-600
      { id: 'diproses', label: 'Diproses', percentage: 15, color: '#FBBF24' }, // amber-400
      { id: 'ditolak', label: 'Ditolak', percentage: 10, color: '#EF4444' } // red-500
    ]
  };
};

export const fetchRecentActivities = (year, service) => {
  // Simulate API response
  return [
    {
      id: 'act-1',
      icon: 'medical_services',
      title: 'Evaluasi Layanan RSUD',
      publisher: 'RSUD Madiun',
      timeLabel: '2 jam lalu',
      link: '#'
    },
    {
      id: 'act-2',
      icon: 'foundation',
      title: 'Kepuasan IMB',
      publisher: 'DPMPTSP',
      timeLabel: '5 jam lalu',
      link: '#'
    },
    {
      id: 'act-3',
      icon: 'school',
      title: 'Survei Pendidikan Dasar',
      publisher: 'Dinas Pendidikan',
      timeLabel: 'Kemarin',
      link: '#'
    },
    {
      id: 'act-4',
      icon: 'badge',
      title: 'Layanan Kependudukan',
      publisher: 'Dispendukcapil',
      timeLabel: 'Kemarin',
      link: '#'
    },
    {
      id: 'act-5',
      icon: 'park',
      title: 'Kebersihan Kota',
      publisher: 'DLH',
      timeLabel: '2 hari lalu',
      link: '#'
    }
  ];
};
