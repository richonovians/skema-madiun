import React from 'react';
import Navbar from '@/components/layouts/Navbar';
import Footer from '@/components/layouts/Footer';
import StatisticsHero from '@/features/statistics/components/StatisticsHero';
import StatisticsDashboard from '@/features/statistics/components/StatisticsDashboard';

export const metadata = {
  title: 'Statistik Publik - SKEMA Madiun',
  description: 'Transparansi hasil Survei Kepuasan Masyarakat (SKM) dan statistik pengaduan layanan publik Pemerintah Kabupaten Madiun.',
};

/**
 * `<StatisticsFilter />` DIHAPUS (2026-08-19): tiga dropdown-nya (tahun, OPD,
 * jenis layanan) menyimpan pilihan di state lokal yang tak pernah dibaca siapa
 * pun, dan `GET /statistics` -- satu-satunya sumber halaman ini -- TIDAK
 * menerima parameter apa pun (DashboardService.getStatistics tanpa query),
 * sehingga tak ada yang bisa disambungkan. Isi opsinya pun karangan: 2 nama OPD
 * dari 54 yang nyata, plus daftar "layanan" yang tak berpadanan di data. Lebih
 * baik tak ada penyaring daripada penyaring yang berpura-pura menyaring.
 * Bila kelak backend menerima filter, kembalikan komponennya beserta wiring-nya.
 */
export default function StatisticsPage() {
  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />
      <StatisticsHero />
      <StatisticsDashboard />
      <Footer />
    </main>
  );
}
