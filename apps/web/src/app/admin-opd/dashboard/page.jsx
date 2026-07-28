'use client';

import React, { useState, useEffect } from 'react';
import DashboardSummary from '@/features/dashboards/components/DashboardSummary';
import TrendChart from '@/features/dashboards/components/TrendChart';
import PerformanceMetrics from '@/features/dashboards/components/PerformanceMetrics';
import RecentFeedback from '@/features/dashboards/components/RecentFeedback';

// Dummy data structured to match a potential API response
const getDummyDashboardData = () => ({
  summary: {
    ikmScore: '82.40',
    ikmGrade: 'B (Baik)',
    totalRespondents: '1,245',
    respondentTrend: '+12% dari bulan lalu',
    activeTickets: '8',
    avgResponseTime: '4.2 Jam',
    slaTarget: '8 Jam'
  },
  performanceMetrics: [
    { name: 'Persyaratan', realization: 3.65, target: 4.00 },
    { name: 'Prosedur', realization: 3.40, target: 4.00 },
    { name: 'Waktu Pelayanan', realization: 3.20, target: 4.00 },
    { name: 'Biaya/Tarif', realization: 3.95, target: 4.00 },
    { name: 'Produk Spesifikasi', realization: 3.55, target: 4.00 },
    { name: 'Kompetensi Pelaksana', realization: 3.70, target: 4.00 },
    { name: 'Perilaku Pelaksana', realization: 3.45, target: 4.00 }
  ],
  recentFeedback: [
    { id: 1, name: 'Andi Pratama', time: '2j yang lalu', comment: 'Pelayanan di Puskesmas Melati sudah sangat cepat, tapi kursi antrean di ruang tunggu kurang banyak.', rating: 4 },
    { id: 2, name: 'Rina Safitri', time: '5j yang lalu', comment: 'Proses pendaftaran online lewat WA sangat membantu, tidak perlu antre dari subuh lagi. Terima kasih.', rating: 5 },
    { id: 3, name: 'Suryo K.', time: '10j yang lalu', comment: 'Dokter spesialis di RSUD sangat kompeten dan ramah dalam menjelaskan diagnosa.', rating: 4 },
    { id: 4, name: 'Maya Sari', time: 'Kemarin', comment: 'Toilet di area gedung B perlu perbaikan krn air sering mampet. Mohon segera dicek.', rating: 2 }
  ]
});

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    // In real implementation:
    // fetch('/api/v1/admin-opd/dashboard').then(res => res.json()).then(setData)
    const timer = setTimeout(() => {
      setData(getDummyDashboardData());
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-secondary font-medium animate-pulse">Memuat data dashboard...</p>
      </div>
    );
  }

  return (
    <>
      <DashboardSummary summaryData={data?.summary} />
      
      <TrendChart 
        title="Tren Nilai IKM per Bulan - 2026"
        subtitle="Visualisasi akumulasi data kepuasan masyarakat tahun berjalan"
      />
      
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <PerformanceMetrics metrics={data?.performanceMetrics} />
        <RecentFeedback feedbacks={data?.recentFeedback} />
      </section>
    </>
  );
}
