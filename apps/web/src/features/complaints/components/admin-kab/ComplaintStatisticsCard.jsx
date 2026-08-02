import React from 'react';
import { BarChart3, Activity, Zap, Hourglass, CalendarRange } from 'lucide-react';

export default function ComplaintStatisticsCard({ complaint }) {
  const stats = complaint.stats || {
    timeToVerify: '-',
    timeToFirstResponse: '-',
    totalDuration: '-',
    estimatedCompletion: '-'
  };

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <BarChart3 size={18} className="text-slate-500" />
        <h3 className="text-title-md font-bold text-slate-800">
          Metrik Penanganan
        </h3>
      </div>
      
      <div className="p-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Zap size={12} className="text-blue-500" /> Waktu Verifikasi
          </span>
          <p className="text-sm font-semibold text-slate-800">{stats.timeToVerify}</p>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Activity size={12} className="text-purple-500" /> Respons Pertama
          </span>
          <p className="text-sm font-semibold text-slate-800">{stats.timeToFirstResponse}</p>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Hourglass size={12} className="text-amber-500" /> Total Durasi
          </span>
          <p className="text-sm font-semibold text-slate-800">{stats.totalDuration}</p>
        </div>

        <div className="space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <CalendarRange size={12} className="text-emerald-500" /> Est. Selesai
          </span>
          <p className="text-sm font-semibold text-slate-800">{stats.estimatedCompletion}</p>
        </div>

      </div>
    </div>
  );
}
