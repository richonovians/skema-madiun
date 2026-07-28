'use client';
import React, { useEffect, useState } from 'react';
import { 
  skmMetrics, 
  skmServiceElements, 
  skmDistribution, 
  skmYearlyTrend 
} from '../constants/skmAnalytics';
import { TrendingUp, TrendingDown, Minus, Verified } from 'lucide-react';

export default function SkmAnalysisView() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <section className="space-y-xl animate-in fade-in duration-500">
      {/* Summary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
        <div className="bg-white/95 backdrop-blur rounded-xl p-lg flex flex-col justify-between h-32 shadow-sm border border-border border-l-4 border-l-primary">
          <span className="text-label-md text-secondary uppercase tracking-wider font-semibold">Nilai IKM (Indeks Kepuasan Masyarakat)</span>
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-lg text-headline-lg text-primary">{skmMetrics.ikm.value}</span>
            <span className="text-label-md text-green-600 font-bold flex items-center">
              <TrendingUp size={16} className="mr-1" />
              {skmMetrics.ikm.trend}
            </span>
          </div>
        </div>
        
        <div className="bg-white/95 backdrop-blur rounded-xl p-lg flex flex-col justify-between h-32 shadow-sm border border-border border-l-4 border-l-tertiary">
          <span className="text-label-md text-secondary uppercase tracking-wider font-semibold">Total Responden</span>
          <div className="flex items-baseline gap-sm">
            <span className="font-headline-lg text-headline-lg text-on-surface">{skmMetrics.totalRespondents.value}</span>
            <span className="text-label-md bg-secondary-container px-sm py-xs rounded text-primary font-bold">
              {skmMetrics.totalRespondents.badge}
            </span>
          </div>
        </div>
        
        <div className="bg-white/95 backdrop-blur rounded-xl p-lg flex flex-col justify-between h-32 shadow-sm border border-border border-l-4 border-l-green-600">
          <span className="text-label-md text-secondary uppercase tracking-wider font-semibold">Mutu Layanan</span>
          <div>
            <span className="inline-flex items-center px-lg py-sm rounded-full bg-green-100 text-green-800 font-bold text-headline-md">
              <Verified size={24} className="mr-xs" />
              {skmMetrics.quality.grade}
            </span>
          </div>
        </div>
      </div>

      {/* 9 Unsur Table */}
      <div className="bg-white/95 backdrop-blur rounded-xl overflow-hidden shadow-sm border border-border">
        <div className="px-lg py-md border-b border-outline-variant bg-surface-container-lowest flex justify-between items-center">
          <h3 className="font-h3 text-h3 text-primary">Analisis 9 Unsur Pelayanan</h3>
          <span className="text-label-md text-secondary italic">NRR: Nilai Rata-Rata per Unsur</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low text-label-md text-secondary font-bold border-b border-outline-variant">
                <th className="px-lg py-md">Kode</th>
                <th className="px-lg py-md whitespace-nowrap">Unsur Pelayanan</th>
                <th className="px-lg py-md">NRR</th>
                <th className="px-lg py-md whitespace-nowrap">NRR Tertimbang</th>
                <th className="px-lg py-md">Status</th>
                <th className="px-lg py-md text-center">Trend</th>
              </tr>
            </thead>
            <tbody className="text-body-md divide-y divide-outline-variant">
              {skmServiceElements.map((item) => (
                <tr key={item.code} className="hover:bg-surface-container-low transition-colors">
                  <td className="px-lg py-md font-mono font-bold text-primary">{item.code}</td>
                  <td className="px-lg py-md font-medium">{item.name}</td>
                  <td className="px-lg py-md">{item.nrr.toFixed(2)}</td>
                  <td className="px-lg py-md font-bold">{item.weighted.toFixed(2)}</td>
                  <td className="px-lg py-md">
                    <span className={`px-sm py-xs rounded text-xs font-bold whitespace-nowrap ${
                      item.status === 'Sangat Baik' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-lg py-md text-center flex justify-center">
                    {item.trend === 'up' && <TrendingUp size={20} className="text-green-600" />}
                    {item.trend === 'down' && <TrendingDown size={20} className="text-red-600" />}
                    {item.trend === 'neutral' && <Minus size={20} className="text-gray-400" />}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Comparative Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-10 gap-lg">
        {/* Stacked Bar */}
        <div className="lg:col-span-6 bg-white/95 backdrop-blur border border-border rounded-xl p-lg shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-lg gap-4">
            <h3 className="font-h3 text-h3 text-primary">Distribusi Skala Kepuasan (1-4)</h3>
            <div className="flex flex-wrap gap-md">
              <span className="flex items-center gap-xs text-[10px] uppercase font-bold text-secondary"><div className="w-2 h-2 rounded-full bg-red-500"></div> S. Buruk</span>
              <span className="flex items-center gap-xs text-[10px] uppercase font-bold text-secondary"><div className="w-2 h-2 rounded-full bg-orange-400"></div> Buruk</span>
              <span className="flex items-center gap-xs text-[10px] uppercase font-bold text-secondary"><div className="w-2 h-2 rounded-full bg-blue-400"></div> Baik</span>
              <span className="flex items-center gap-xs text-[10px] uppercase font-bold text-secondary"><div className="w-2 h-2 rounded-full bg-green-500"></div> S. Baik</span>
            </div>
          </div>
          <div className="space-y-md h-64 overflow-y-auto pr-sm">
            {skmDistribution.map((item) => (
              <div key={item.code} className="space-y-xs">
                <div className="flex justify-between text-label-md">
                  <span>{item.code}. {item.name}</span> 
                  <span className="font-bold text-secondary">{item.total.toLocaleString('id-ID')} Responden</span>
                </div>
                <div className="flex h-4 w-full rounded-full overflow-hidden">
                  <div className="bg-red-500 transition-all duration-1000 ease-out" style={{ width: animate ? `${item.distribution.veryBad}%` : '0%' }}></div>
                  <div className="bg-orange-400 transition-all duration-1000 ease-out delay-100" style={{ width: animate ? `${item.distribution.bad}%` : '0%' }}></div>
                  <div className="bg-blue-400 transition-all duration-1000 ease-out delay-200" style={{ width: animate ? `${item.distribution.good}%` : '0%' }}></div>
                  <div className="bg-green-500 transition-all duration-1000 ease-out delay-300" style={{ width: animate ? `${item.distribution.veryGood}%` : '0%' }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Trend Line Chart SVG */}
        <div className="lg:col-span-4 bg-white/95 backdrop-blur border border-border rounded-xl p-lg shadow-sm flex flex-col">
          <h3 className="font-h3 text-h3 text-primary mb-lg">Tren IKM Tahunan (2024-2026)</h3>
          <div className="flex-1 relative border-l border-b border-outline-variant mt-md ml-8 mb-8">
            <svg className="w-full h-full stroke-primary fill-none overflow-visible" viewBox="0 0 400 200" preserveAspectRatio="none">
              <path 
                d="M0,180 L50,160 L100,165 L150,150 L200,140 L250,130 L300,110 L350,90 L400,70" 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth="4"
                style={{
                  strokeDasharray: 800,
                  strokeDashoffset: animate ? 0 : 800,
                  transition: 'stroke-dashoffset 2s ease-out'
                }}
              ></path>
              <circle cx="400" cy="70" fill="#2563EB" r="6" className={`transition-opacity duration-1000 delay-[1500ms] ${animate ? 'opacity-100' : 'opacity-0'}`}></circle>
              
              <text className="fill-secondary text-[10px]" x="-35" y="180">75.0</text>
              <text className="fill-secondary text-[10px]" x="-35" y="130">80.0</text>
              <text className="fill-secondary text-[10px]" x="-35" y="80">85.0</text>
              
              <text className="fill-secondary text-[10px]" x="0" y="210">2024</text>
              <text className="fill-secondary text-[10px]" x="200" y="210">2025</text>
              <text className="fill-secondary text-[10px]" x="400" y="210">2026</text>
            </svg>
          </div>
          <p className="text-label-md text-secondary text-center">Data menunjukkan kenaikan konsisten sebesar 1.8% per tahun.</p>
        </div>
      </div>
    </section>
  );
}
