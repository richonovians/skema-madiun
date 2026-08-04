'use client';
import React from 'react';
import { TrendingUp, Verified, History } from 'lucide-react';

/**
 * Hasil IKM sungguhan per survei (GET /surveys/:id/results, INT-21) -- props
 * datang dari adaptIkmMetrics/adaptIkmServiceElements (ikm.adapter.js), BUKAN
 * lagi konstanta dummy (skmMetrics/skmServiceElements/skmDistribution/
 * skmYearlyTrend di constants/skmAnalytics.js, kini tak terpakai).
 *
 * CATATAN GAP (lihat komentar ikm.adapter.js): trend IKM, status/trend per
 * unsur, distribusi skor per unsur, dan tren tahunan multi-periode SEMUA
 * butuh data historis lintas periode yang belum dibangun backend (Fase 3,
 * INT-15, terblokir keputusan D5) -- field terkait bernilai `null` dan
 * ditampilkan sebagai gap eksplisit di bawah, bukan dikarang.
 */
export default function SkmAnalysisView({
  metrics,
  serviceElements = [],
  periode,
  jumlahResponden,
}) {
  const hasResponden = jumlahResponden > 0 && serviceElements.length > 0;

  return (
    <section className="space-y-xl animate-in fade-in duration-500">
      {periode && (
        <p className="text-label-md text-secondary">
          Periode: <span className="font-bold text-on-surface">{periode}</span>
        </p>
      )}

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div className="bg-white/95 backdrop-blur rounded-xl p-lg flex flex-col justify-between h-32 shadow-sm border border-border border-l-4 border-l-primary">
          <span className="text-label-md text-secondary uppercase tracking-wider font-semibold">Nilai IKM (Indeks Kepuasan Masyarakat)</span>
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-lg text-headline-lg text-primary">
              {metrics.ikm.value !== null ? metrics.ikm.value.toFixed(2) : '-'}
            </span>
            {metrics.ikm.trend && (
              <span className="text-label-md text-green-600 font-bold flex items-center">
                <TrendingUp size={16} className="mr-1" />
                {metrics.ikm.trend}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-xl p-lg flex flex-col justify-between h-32 shadow-sm border border-border border-l-4 border-l-tertiary">
          <span className="text-label-md text-secondary uppercase tracking-wider font-semibold">Total Responden</span>
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-lg text-headline-lg text-on-surface">{metrics.totalRespondents.value}</span>
            {metrics.totalRespondents.badge && (
              <span className="text-label-md bg-secondary-container px-sm py-xs rounded text-primary font-bold">
                {metrics.totalRespondents.badge}
              </span>
            )}
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur rounded-xl p-lg flex flex-col justify-between h-32 shadow-sm border border-border border-l-4 border-l-green-600">
          <span className="text-label-md text-secondary uppercase tracking-wider font-semibold">Mutu Layanan</span>
          <div>
            {metrics.quality.grade ? (
              <span className="inline-flex items-center px-lg py-sm rounded-full bg-green-100 text-green-800 font-bold text-headline-md">
                <Verified size={24} className="mr-xs" />
                {metrics.quality.grade}
              </span>
            ) : (
              <span className="inline-flex items-center px-lg py-sm rounded-full bg-surface-variant text-on-surface-variant font-bold text-body-md">
                Belum dapat dinilai
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 9 Unsur Table */}
      <div className="bg-white/95 backdrop-blur rounded-xl overflow-hidden shadow-sm border border-border">
        <div className="px-lg py-md border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center">
          <h3 className="font-h3 text-h3 text-primary">Analisis 9 Unsur Pelayanan</h3>
          <span className="text-label-md text-secondary italic">NRR: Nilai Rata-Rata per Unsur</span>
        </div>
        {!hasResponden ? (
          <div className="py-2xl text-center text-secondary">
            Belum ada responden yang mengisi survei ini -- NRR per unsur baru dapat dihitung setelah ada jawaban masuk.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low text-label-md text-secondary font-bold border-b border-outline-variant">
                  <th className="px-lg py-md">Kode</th>
                  <th className="px-lg py-md whitespace-nowrap">Unsur Pelayanan</th>
                  <th className="px-lg py-md">NRR</th>
                  <th className="px-lg py-md whitespace-nowrap">NRR Tertimbang</th>
                </tr>
              </thead>
              <tbody className="text-body-md divide-y divide-outline-variant">
                {serviceElements.map((item) => (
                  <tr key={item.code} className="hover:bg-surface-container-low transition-colors">
                    <td className="px-lg py-md font-mono font-bold text-primary">{item.code}</td>
                    <td className="px-lg py-md font-medium">{item.name}</td>
                    <td className="px-lg py-md">{item.nrr.toFixed(2)}</td>
                    <td className="px-lg py-md font-bold">{item.weighted.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Distribusi skor per unsur & tren tahunan: TIDAK ADA sumber backend --
          IkmResultEntity cuma simpan NRR rata-rata per survei, bukan distribusi
          per nilai jawaban maupun snapshot lintas periode (lihat gap di
          ikm.adapter.js). Ditampilkan sbg gap eksplisit, bukan grafik karangan. */}
      <div className="bg-white/95 backdrop-blur border border-border rounded-xl p-lg shadow-sm flex items-start gap-md">
        <div className="p-2 bg-surface-variant rounded-lg text-on-surface-variant flex-shrink-0">
          <History size={20} />
        </div>
        <div>
          <h3 className="font-h3 text-h3 text-primary mb-xs">Tren & Distribusi Skor Belum Tersedia</h3>
          <p className="text-body-md text-secondary max-w-[640px]">
            Distribusi skor per unsur dan tren IKM lintas periode/tahun memerlukan agregasi
            data historis yang belum dibangun di backend. Data yang ditampilkan di atas adalah
            hasil hitung langsung (live) untuk survei terpilih saja.
          </p>
        </div>
      </div>
    </section>
  );
}
