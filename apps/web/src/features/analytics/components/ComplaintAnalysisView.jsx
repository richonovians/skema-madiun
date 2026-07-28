'use client';
import React, { useEffect, useState } from 'react';
import { 
  complaintCategories, 
  complaintSla, 
  complaintVolumeMonthly, 
  complaintResolutionStats 
} from '../constants/complaintAnalytics';

export default function ComplaintAnalysisView() {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
  }, []);

  return (
    <section className="space-y-xl animate-in fade-in duration-500">
      {/* Row 1: Donut & Bar SLA */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <div className="bg-white/95 backdrop-blur border border-border rounded-xl p-lg shadow-sm">
          <h3 className="font-h3 text-h3 text-primary mb-lg">Kategori Pengaduan Terbanyak</h3>
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-xl">
            <div className="relative w-48 h-48 flex-shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" fill="transparent" r="16" stroke="#E2E8F0" strokeWidth="4"></circle>
                <circle 
                  cx="18" cy="18" fill="transparent" r="16" 
                  stroke={complaintCategories.categories[0].color} 
                  strokeDasharray={`${animate ? complaintCategories.categories[0].percentage : 0} 100`} 
                  strokeWidth="4"
                  className="transition-all duration-1000 ease-out"
                ></circle>
                <circle 
                  cx="18" cy="18" fill="transparent" r="16" 
                  stroke={complaintCategories.categories[1].color} 
                  strokeDasharray={`${animate ? complaintCategories.categories[1].percentage : 0} 100`} 
                  strokeDashoffset={`-${complaintCategories.categories[0].percentage}`} 
                  strokeWidth="4"
                  className="transition-all duration-1000 ease-out delay-300"
                ></circle>
                <circle 
                  cx="18" cy="18" fill="transparent" r="16" 
                  stroke={complaintCategories.categories[2].color} 
                  strokeDasharray={`${animate ? complaintCategories.categories[2].percentage : 0} 100`} 
                  strokeDashoffset={`-${complaintCategories.categories[0].percentage + complaintCategories.categories[1].percentage}`} 
                  strokeWidth="4"
                  className="transition-all duration-1000 ease-out delay-700"
                ></circle>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-headline-md font-bold text-primary">{complaintCategories.total}</span>
                <span className="text-[10px] text-secondary">Total Aduan</span>
              </div>
            </div>
            <div className="flex-1 space-y-md w-full">
              {complaintCategories.categories.map((cat, idx) => (
                <div key={idx} className="flex justify-between items-center text-label-md">
                  <span className="flex items-center gap-xs">
                    <div className="w-3 h-3 rounded" style={{ backgroundColor: cat.color }}></div> 
                    {cat.name}
                  </span>
                  <span className="font-bold">{cat.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white/95 backdrop-blur border border-border rounded-xl p-lg shadow-sm">
          <h3 className="font-h3 text-h3 text-primary mb-lg">Resolusi SLA per Prioritas</h3>
          <div className="space-y-lg">
            {complaintSla.map((sla, idx) => (
              <div key={idx} className="space-y-xs">
                <div className="flex justify-between text-label-md">
                  <span className={`font-bold ${sla.textClass}`}>{sla.priority}</span>
                  <span className="text-secondary">{sla.completionRate}% Selesai</span>
                </div>
                <div className="w-full h-3 bg-surface-container rounded-full overflow-hidden">
                  <div 
                    className={`h-full ${sla.colorClass} transition-all duration-1000 ease-out`} 
                    style={{ width: animate ? `${sla.completionRate}%` : '0%', transitionDelay: `${idx * 200}ms` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Deep Metrics: Volume & Duration */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <div className="lg:col-span-2 bg-white/95 backdrop-blur border border-border rounded-xl p-lg shadow-sm">
          <h3 className="font-h3 text-h3 text-primary mb-lg">Volume Pengaduan Bulanan</h3>
          <div className="flex items-end gap-md h-48 pt-lg">
            {complaintVolumeMonthly.map((vol, idx) => {
              const maxVal = Math.max(...complaintVolumeMonthly.map(v => v.received));
              const receivedHeight = (vol.received / maxVal) * 100;
              const completedHeight = (vol.completed / vol.received) * 100;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-xs h-full justify-end">
                  <div 
                    className="w-full bg-primary-container/20 rounded-t-lg relative transition-all duration-1000 origin-bottom" 
                    style={{ height: animate ? `${receivedHeight}%` : '0%', transitionDelay: `${idx * 100}ms` }}
                  >
                    <div 
                      className="absolute inset-x-0 bottom-0 bg-primary rounded-t-lg transition-all duration-1000" 
                      style={{ height: animate ? `${completedHeight}%` : '0%', transitionDelay: `${(idx * 100) + 500}ms` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-secondary font-bold">{vol.month}</span>
                </div>
              );
            })}
          </div>
          <div className="mt-md flex justify-center gap-xl text-label-md">
            <span className="flex items-center gap-xs"><div className="w-3 h-3 bg-primary rounded"></div> Selesai</span>
            <span className="flex items-center gap-xs"><div className="w-3 h-3 bg-primary-container/20 rounded"></div> Masuk</span>
          </div>
        </div>
        
        <div className="bg-inverse-surface border border-border rounded-xl p-lg shadow-sm text-on-primary flex flex-col justify-center">
          <h3 className="font-h3 text-h3 text-primary-fixed mb-lg text-center">Rata-Rata Penyelesaian</h3>
          <div className="space-y-xl">
            <div className="text-center">
              <span className="text-headline-xl font-extrabold text-white">{complaintResolutionStats.averageDays}</span>
              <span className="text-headline-md font-medium text-primary-fixed ml-xs">Hari</span>
              <p className="text-label-md text-outline-variant mt-xs">Waktu rata-rata tindak lanjut</p>
            </div>
            <div className="grid grid-cols-2 gap-md pt-lg border-t border-on-surface-variant/30">
              <div className="text-center">
                <span className="block font-bold text-headline-md text-green-400">{complaintResolutionStats.successRate}%</span>
                <span className="text-[10px] text-outline-variant uppercase">Success Rate</span>
              </div>
              <div className="text-center">
                <span className="block font-bold text-headline-md text-blue-400">{complaintResolutionStats.openTickets}</span>
                <span className="text-[10px] text-outline-variant uppercase">Open Tickets</span>
              </div>
            </div>
            <button className="w-full py-md bg-primary hover:bg-primary-hover text-on-primary rounded-lg font-bold text-label-md transition-all">
              Lihat Semua Antrian
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
