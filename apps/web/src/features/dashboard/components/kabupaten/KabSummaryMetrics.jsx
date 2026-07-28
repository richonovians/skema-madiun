'use client';
import React from 'react';
import { LineChart, Users, AlertTriangle, Network } from 'lucide-react';

export default function KabSummaryMetrics({ data }) {
  if (!data) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-lg">
      
      {/* Metric Card 1 */}
      <div className="bg-white p-lg rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-slate-100 flex flex-col justify-between group transition-all duration-300">
        <div className="flex justify-between items-start mb-md">
          <span className="p-sm bg-primary/10 text-primary rounded-lg">
            <LineChart size={24} />
          </span>
          <span className="bg-blue-100 text-primary text-[10px] font-bold px-sm py-xs rounded-full uppercase tracking-wider">
            Mutu: {data.ikmGrade} ({data.ikmLabel})
          </span>
        </div>
        <div>
          <p className="text-text-secondary text-sm font-medium mb-xs">Rata-Rata IKM Kabupaten</p>
          <h3 className="text-4xl font-extrabold text-text-primary tracking-tight">
            {data.ikmScore.toFixed(2)}
          </h3>
        </div>
      </div>

      {/* Metric Card 2 */}
      <div className="bg-white p-lg rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-slate-100 flex flex-col justify-between group transition-all duration-300">
        <div className="flex justify-between items-start mb-md">
          <span className="p-sm bg-secondary-container/30 text-secondary rounded-lg">
            <Users size={24} />
          </span>
        </div>
        <div>
          <p className="text-text-secondary text-sm font-medium mb-xs">Partisipasi Responden</p>
          <div className="flex items-baseline gap-xs">
            <h3 className="text-4xl font-extrabold text-text-primary tracking-tight">
              {data.totalRespondents.toLocaleString('id-ID')}
            </h3>
            <span className="text-text-secondary text-xs font-semibold">Warga</span>
          </div>
        </div>
      </div>

      {/* Metric Card 3 */}
      <div className="bg-white p-lg rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-slate-100 flex flex-col justify-between group transition-all duration-300">
        <div className="flex justify-between items-start mb-md">
          <span className="p-sm bg-error-container/30 text-error rounded-lg">
            <AlertTriangle size={24} />
          </span>
          {data.newComplaints > 0 && (
            <span className="text-error text-xs font-bold px-sm py-xs">
              +{data.newComplaints} Baru
            </span>
          )}
        </div>
        <div>
          <p className="text-text-secondary text-sm font-medium mb-xs">Total Pengaduan Terbuka</p>
          <div className="flex items-baseline gap-xs">
            <h3 className="text-4xl font-extrabold text-text-primary tracking-tight">
              {data.openComplaints}
            </h3>
            <span className="text-text-secondary text-xs font-semibold">Tiket</span>
          </div>
        </div>
      </div>

      {/* Metric Card 4 */}
      <div className="bg-white p-lg rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 border border-slate-100 flex flex-col justify-between group transition-all duration-300">
        <div className="flex justify-between items-start mb-md">
          <span className="p-sm bg-surface-container-highest/50 text-on-surface-variant rounded-lg">
            <Network size={24} />
          </span>
        </div>
        <div>
          <p className="text-text-secondary text-sm font-medium mb-xs">Keaktifan Sistem</p>
          <h3 className="text-4xl font-extrabold text-text-primary tracking-tight">
            {data.systemActivityPercent}%
          </h3>
          <p className="text-[10px] text-text-secondary mt-xs">Seluruh OPD Terintegrasi</p>
        </div>
      </div>

    </div>
  );
}
