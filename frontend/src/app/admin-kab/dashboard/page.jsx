'use client';
import React from 'react';
import KabDashboardHeader from '@/features/dashboard/components/kabupaten/KabDashboardHeader';
import KabSummaryMetrics from '@/features/dashboard/components/kabupaten/KabSummaryMetrics';
import IkmLeaderboard from '@/features/dashboard/components/kabupaten/IkmLeaderboard';
import ComplaintStatusDonut from '@/features/dashboard/components/kabupaten/ComplaintStatusDonut';
import RecentActivities from '@/features/dashboard/components/kabupaten/RecentActivities';

import {
  fetchSummaryMetrics,
  fetchIkmLeaderboard,
  fetchComplaintDistribution,
  fetchRecentActivities
} from '@/features/dashboard/constants/kabDashboardData';

import { useSearchParams } from 'next/navigation';

// Imports for public statistics components
import { Users, FileText, CheckCircle, Clock, Building2, TrendingUp } from 'lucide-react';
import { dummyStatisticsResponse } from '@/features/statistics/constants/dummyStatistics';
import MetricCard from '@/features/statistics/components/MetricCard';
import TrendChart from '@/features/statistics/components/charts/TrendChart';
import BarChart from '@/features/statistics/components/charts/BarChart';
import HorizontalProgress from '@/features/statistics/components/charts/HorizontalProgress';

export default function AdminKabDashboardPage() {
  const searchParams = useSearchParams();
  const filters = {
    year: searchParams.get('year') || '2024',
    service: searchParams.get('service') || 'all'
  };

  // Simulated data fetching based on filters
  const summaryData = fetchSummaryMetrics(filters.year, filters.service);
  const leaderboardData = fetchIkmLeaderboard(filters.year, filters.service);
  const complaintData = fetchComplaintDistribution(filters.year, filters.service);
  const activitiesData = fetchRecentActivities(filters.year, filters.service);

  const { 
    summary, 
    ikmTrend, 
    serviceElements, 
    valueDistribution 
  } = dummyStatisticsResponse;

  return (
    <div className="min-h-screen p-lg space-y-lg relative">
      <KabDashboardHeader filters={filters} />
      
      {/* Existing KabSummaryMetrics */}
      <KabSummaryMetrics data={summaryData} />

      {/* Ringkasan KPI (Bento Grid from Public Stats) */}
      <section className="mt-8">
        <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
          <TrendingUp size={24} className="text-primary" />
          Ringkasan Kinerja Terkini (Detail Lengkap)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <MetricCard 
            title="Indeks Kepuasan Masyarakat" 
            value={summary.ikm} 
            subtitle="Dari skala 100"
            icon={TrendingUp} 
            colorClass="text-primary"
          />
          <MetricCard 
            title="Total Responden" 
            value={summary.totalRespondents.toLocaleString()} 
            subtitle="Masyarakat yang berpartisipasi"
            icon={Users} 
            colorClass="text-blue-600"
          />
          <MetricCard 
            title="Total Pengaduan" 
            value={summary.totalComplaints.toLocaleString()} 
            subtitle="Aduan masuk sistem"
            icon={FileText} 
            colorClass="text-orange-500"
          />
          <MetricCard 
            title="Tingkat Penyelesaian" 
            value={`${summary.completionRate}%`} 
            subtitle="Pengaduan yang diselesaikan"
            icon={CheckCircle} 
            colorClass="text-emerald-600"
          />
          <MetricCard 
            title="Rata-rata SLA" 
            value={`${summary.avgSlaDays} Hari`} 
            subtitle="Waktu respon pengaduan"
            icon={Clock} 
            colorClass="text-indigo-500"
          />
          <MetricCard 
            title="Jumlah OPD Aktif" 
            value={summary.activeOpd} 
            subtitle="Terintegrasi dengan sistem"
            icon={Building2} 
            colorClass="text-slate-600"
          />
        </div>
      </section>

      {/* Visualisasi SKM (From Public Stats) */}
      <section className="mt-8">
        <div className="mb-6 border-b border-border pb-2">
          <h2 className="text-2xl font-bold text-text-primary">Statistik Kepuasan Masyarakat (SKM) & Penilaian Unsur</h2>
          <p className="text-text-secondary">Analisis tren dan distribusi penilaian layanan publik berdasarkan PermenPAN RB.</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Tren IKM */}
          <div className="lg:col-span-2">
            <TrendChart 
              title="Tren Indeks Kepuasan Masyarakat (6 Bulan)" 
              data={ikmTrend} 
              dataKey="value"
              yMin={75}
              yMax={100}
            />
          </div>
          
          {/* Distribusi Nilai */}
          <div>
            <BarChart 
              title="Distribusi Nilai Penilaian"
              data={valueDistribution}
            />
          </div>
          
          {/* 9 Unsur Pelayanan */}
          <div className="lg:col-span-3">
            <HorizontalProgress 
              title="Penilaian 9 Unsur Pelayanan (PermenPAN RB)"
              data={serviceElements}
            />
          </div>
        </div>
      </section>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg mt-8">
        <IkmLeaderboard data={leaderboardData} />
        <ComplaintStatusDonut data={complaintData} />
      </div>

      <RecentActivities data={activitiesData} />
    </div>
  );
}
