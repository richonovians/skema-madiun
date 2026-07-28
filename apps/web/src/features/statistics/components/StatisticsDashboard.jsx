import React from 'react';
import { dummyStatisticsResponse } from '../constants/dummyStatistics';
import InsightCard from './InsightCard';
import TopOpdRanking from './TopOpdRanking';
import BarChart from './charts/BarChart';

export default function StatisticsDashboard() {
  const { 
    insight, 
    complaintCategories, 
    topOpd 
  } = dummyStatisticsResponse;

  return (
    <div className="bg-background py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
        
        {/* Insight Section */}
        <section>
          <InsightCard text={insight.text} />
        </section>

        {/* Visualisasi Pengaduan & Top OPD */}
        <section className="mt-4">
          <div className="mb-6 border-b border-border pb-2">
            <h2 className="text-2xl font-bold text-text-primary">Statistik Pengaduan & Peringkat Instansi</h2>
            <p className="text-text-secondary">Analisis kategori pengaduan terbanyak dan peringkat OPD dalam penanganan laporan.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Kategori Terbanyak */}
            <div className="w-full">
              <BarChart 
                title="Top Kategori Pengaduan"
                data={complaintCategories}
              />
            </div>

            {/* Top OPD */}
            <div className="w-full h-full">
              <TopOpdRanking data={topOpd} />
            </div>
          </div>
        </section>

      </div>
    </div>
  );
}
