import React from 'react';
import Navbar from '@/components/layouts/Navbar';
import Footer from '@/components/layouts/Footer';
import StatisticsHero from '@/features/statistics/components/StatisticsHero';
import StatisticsFilter from '@/features/statistics/components/StatisticsFilter';
import StatisticsDashboard from '@/features/statistics/components/StatisticsDashboard';

export const metadata = {
  title: 'Statistik Publik - SKEMA Madiun',
  description: 'Transparansi hasil Survei Kepuasan Masyarakat (SKM) dan statistik pengaduan layanan publik Pemerintah Kabupaten Madiun.',
};

export default function StatisticsPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <StatisticsHero />
      <StatisticsFilter />
      <StatisticsDashboard />
      <Footer />
    </main>
  );
}
