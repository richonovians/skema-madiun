'use client';

import React, { useCallback } from 'react';
import { MessageSquare, BarChart3, Users } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { getStatistics } from '@/features/statistics/services/statistics.api';

/**
 * Ilustrasi hero halaman Tentang Kami: tiga kartu bergaya dashboard.
 *
 * DULU seluruh angkanya karangan dan dipajang di halaman publik seolah capaian
 * nyata: "Total Pengaduan 1,248" dengan lencana "+12%", bilah "Terselesaikan
 * 78%", "Indeks IKM 89.5", dan lima bintang penuh. Karena bentuknya kartu
 * dashboard (bukan gambar dekoratif), pembaca wajar menganggapnya data betulan.
 *
 * Kini angkanya dari `GET /statistics` (publik, sama seperti AboutStatistics dan
 * halaman /statistics). Dua elemen lama DIHAPUS, bukan dicarikan padanan:
 * - lencana tren "+12%": backend tak menghitung tren pengaduan periode-ke-periode
 *   pada ringkasan ini, jadi tak ada angka yang bisa mengisinya.
 * - lima bintang: penilaian SKM memakai skala 1-4 per unsur lalu diagregasi jadi
 *   IKM 0-100, tak ada konsep rating bintang sama sekali. Diganti jumlah
 *   responden, yang memang ada.
 */
export default function AboutHeroShowcase() {
  const fetchStatistics = useCallback(() => getStatistics(), []);
  const { data, isLoading } = useAsync(fetchStatistics);

  const summary = data?.summary;
  const completionRate = summary?.completionRate;

  const skeletonClass = 'inline-block h-8 w-20 rounded-lg bg-slate-200 animate-pulse';

  return (
    <div className="relative w-full aspect-square lg:aspect-[4/3] rounded-[2rem] overflow-hidden flex items-center justify-center bg-slate-50/50 border border-slate-100">
      {/* Abstract Gradient Background */}
      <div className="absolute top-[-10%] right-[-10%] w-72 h-72 bg-blue-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-72 h-72 bg-purple-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>
      <div className="absolute top-[20%] left-[20%] w-72 h-72 bg-emerald-400/20 rounded-full mix-blend-multiply filter blur-3xl opacity-70"></div>

      {/* Dotted Pattern Overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, #000 1px, transparent 0)',
          backgroundSize: '24px 24px',
        }}
      ></div>

      {/* Kartu utama -- Total Pengaduan & tingkat penyelesaian */}
      <div className="relative z-10 w-[260px] md:w-[280px] bg-white/90 backdrop-blur-xl border border-white p-6 rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.05)] transition-transform duration-700 hover:-translate-y-2">
        <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center text-white mb-5 shadow-lg shadow-blue-500/30">
          <MessageSquare size={24} />
        </div>
        <h3 className="font-bold text-slate-800 mb-2 text-lg">Total Pengaduan</h3>
        <div className="flex items-end gap-3 mb-5">
          {isLoading ? (
            <span className={skeletonClass} />
          ) : (
            <span className="text-4xl font-black text-slate-900 tracking-tight">
              {summary?.totalComplaints != null
                ? summary.totalComplaints.toLocaleString('id-ID')
                : '-'}
            </span>
          )}
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5 mb-2 overflow-hidden">
          <div
            className="bg-blue-500 h-2.5 rounded-full transition-all duration-700"
            style={{ width: `${completionRate ?? 0}%` }}
          ></div>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-xs text-slate-500 font-medium">Terselesaikan</span>
          <span className="text-xs text-slate-700 font-bold">
            {completionRate != null ? `${completionRate}%` : '-'}
          </span>
        </div>
      </div>

      {/* Kartu mengapung 1 -- Indeks IKM */}
      <div className="hidden sm:block absolute top-[10%] right-[2%] md:right-[5%] z-20 w-40 md:w-48 bg-white/95 backdrop-blur-xl border border-white p-3 md:p-4 rounded-2xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.08)] transition-transform duration-700 hover:-translate-y-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600 shrink-0">
            <BarChart3 size={18} />
          </div>
          <div>
            <p className="text-[10px] md:text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              Indeks IKM
            </p>
            <p className="font-black text-slate-800 text-base md:text-lg">
              {isLoading ? (
                <span className="inline-block h-4 w-12 rounded bg-slate-200 animate-pulse" />
              ) : (
                (summary?.ikm != null ? summary.ikm.toFixed(2) : '-')
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Kartu mengapung 2 -- Responden (dulu lima bintang tanpa sumber data) */}
      <div className="hidden sm:block absolute bottom-[10%] left-[2%] md:left-[5%] z-20 w-44 md:w-[220px] bg-white/95 backdrop-blur-xl border border-white p-3 md:p-4 rounded-2xl shadow-[0_15px_30px_-10px_rgba(0,0,0,0.08)] transition-transform duration-700 hover:-translate-y-1">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shrink-0">
            <Users size={18} />
          </div>
          <div>
            <p className="text-[10px] md:text-[11px] text-slate-500 font-medium uppercase tracking-wider">
              Responden
            </p>
            <p className="font-black text-slate-800 text-base md:text-lg">
              {isLoading ? (
                <span className="inline-block h-4 w-12 rounded bg-slate-200 animate-pulse" />
              ) : (
                (summary?.totalRespondents != null
                  ? summary.totalRespondents.toLocaleString('id-ID')
                  : '-')
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
