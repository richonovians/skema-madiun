'use client';

import React, { useCallback } from 'react';
import TopOpdRanking from './TopOpdRanking';
import BarChart from './charts/BarChart';
import EfektivitasPengaduan from './EfektivitasPengaduan';
import TrenPengaduan from './TrenPengaduan';
import TrendChart from './charts/TrendChart';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getStatistics } from '../services/statistics.api';

/** INT-14: sebelumnya 100% dummy statis. Kini pakai GET /statistics publik sungguhan (D2, tanpa login). */
export default function StatisticsDashboard() {
  const fetchStatistics = useCallback(() => getStatistics(), []);
  const { data, isLoading, error, refetch } = useAsync(fetchStatistics);

  if (isLoading) {
    return <LoadingState label="Memuat statistik..." />;
  }

  if (error) {
    return <ErrorState title="Gagal memuat statistik" description={error.message} onRetry={refetch} />;
  }

  const {
    complaintCategories,
    summary,
    topOpd,
    ikmTrend,
    complaintTrendBulanan,
    complaintTrendTahunan,
    completedComplaints,
  } = data;

  return (
    <div className="bg-background py-8 sm:py-12 px-4 sm:px-6">
      <div className="max-w-[1280px] mx-auto flex flex-col gap-8">
        {/* Visualisasi Pengaduan & Top OPD */}
        <section className="mt-4">
          <div className="mb-6 border-b border-border pb-2">
            <h2 className="text-2xl font-bold text-text-primary">Statistik Pengaduan & Peringkat Instansi</h2>
            <p className="text-text-secondary">Analisis kategori pengaduan terbanyak dan peringkat OPD dalam penanganan laporan.</p>
          </div>

          {/* Grid 2x2 SETEMA PER BARIS (3 November 2026, permintaan pemilik
              produk): baris pengaduan = kategori + efektivitas | tren jumlah
              pengaduan; baris IKM = Top OPD | tren IKM. Urutan sel di sini
              juga urutan di ponsel, jadi pasangan temanya tetap berdampingan.

              Hanya sel GRAFIK yang ditarik setinggi barisnya, dan grafiknya
              ikut memanjang (`isiTinggi`). Sel kiri `self-start`: setinggi
              isinya sendiri, sebab meregangkannya meninggalkan ruang kosong
              di dalam kartu (dibereskan 7 Oktober 2026). Penahannya per sel,
              bukan `items-start` pada grid, justru karena sel kanan harus
              tetap meregang. */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="w-full min-w-0 self-start">
              {/* Kategori DAN efektivitas penyelesaian, satu kartu. Semula
                  sebaran status per-kasus; diganti 7 Oktober 2026 atas
                  keputusan pemilik produk. Lihat docblock
                  EfektivitasPengaduan.jsx untuk alasannya. */}
              {complaintCategories.length > 0 ? (
                <BarChart title="Top Kategori Pengaduan" data={complaintCategories}>
                  <EfektivitasPengaduan summary={summary} selesai={completedComplaints} />
                </BarChart>
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm text-sm text-text-secondary">
                  Belum ada data pengaduan.
                </div>
              )}
            </div>

            <div className="flex w-full min-w-0 flex-col">
              <TrenPengaduan bulanan={complaintTrendBulanan} tahunan={complaintTrendTahunan} />
            </div>

            <div className="w-full min-w-0 self-start">
              {topOpd.length > 0 ? (
                <TopOpdRanking data={topOpd} />
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm text-sm text-text-secondary">
                  Belum ada hasil IKM yang tercatat.
                </div>
              )}
            </div>

            <div className="flex w-full min-w-0 flex-col">
              {/* Tren IKM per triwulan, sesuai periode survei (D5). Skala
                  0-100 tetap, sama dengan nilai IKM di Top OPD. */}
              {ikmTrend.length > 0 ? (
                <TrendChart
                  title="Tren IKM"
                  data={ikmTrend}
                  dataKey="value"
                  yMin={0}
                  yMax={100}
                  isiTinggi
                />
              ) : (
                <div className="bg-white rounded-2xl p-6 border border-border shadow-sm">
                  <h3 className="text-lg font-bold text-text-primary mb-2">Tren IKM</h3>
                  <p className="text-sm text-text-secondary">Belum ada nilai IKM per triwulan.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
