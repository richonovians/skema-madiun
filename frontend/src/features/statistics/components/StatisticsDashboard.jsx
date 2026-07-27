import React from 'react';
import { Users, FileText, CheckCircle, Clock, Building2, TrendingUp } from 'lucide-react';
import { dummyStatisticsResponse } from '../constants/dummyStatistics';
import InsightCard from './InsightCard';
import MetricCard from './MetricCard';
import TopOpdRanking from './TopOpdRanking';
import DonutChart from './charts/DonutChart';
import TrendChart from './charts/TrendChart';
import BarChart from './charts/BarChart';
import HorizontalProgress from './charts/HorizontalProgress';

export default function StatisticsDashboard() {
  const { 
    summary, 
    insight, 
    ikmTrend, 
    complaintTrend, 
    complaintStatus, 
    serviceElements, 
    valueDistribution, 
    complaintCategories, 
    topOpd 
  } = dummyStatisticsResponse;

  return (
    <div className="bg-background py-12 px-6">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
        
        {/* Insight Section */}
        <section>
          <InsightCard text={insight.text} />
        </section>

        {/* Ringkasan KPI (Bento Grid) */}
        <section>
          <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
            <TrendingUp size={24} className="text-primary" />
            Ringkasan Kinerja Terkini
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

        {/* Visualisasi SKM */}
        <section className="mt-8">
          <div className="mb-6 border-b border-border pb-2">
            <h2 className="text-2xl font-bold text-text-primary">Statistik Kepuasan Masyarakat (SKM)</h2>
            <p className="text-text-secondary">Analisis tren dan distribusi penilaian layanan publik.</p>
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

        {/* Visualisasi Pengaduan & Top OPD */}
        <section className="mt-8">
          <div className="mb-6 border-b border-border pb-2">
            <h2 className="text-2xl font-bold text-text-primary">Statistik & Penanganan Pengaduan</h2>
            <p className="text-text-secondary">Laporan penerimaan, kategori aduan, dan peringkat penyelesaian.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Trend Pengaduan */}
            <div className="lg:col-span-2">
              <TrendChart 
                title="Volume Pengaduan Masuk" 
                data={complaintTrend} 
                dataKey="count"
                yMin={0}
                yMax={250}
              />
            </div>
            
            {/* Status Pengaduan */}
            <div>
              <DonutChart 
                title="Status Penanganan"
                data={complaintStatus}
              />
            </div>
            
            {/* Kategori Terbanyak */}
            <div className="lg:col-span-2">
              <BarChart 
                title="Top Kategori Pengaduan"
                data={complaintCategories}
              />
            </div>

            {/* Top OPD */}
            <div>
              <TopOpdRanking data={topOpd} />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
