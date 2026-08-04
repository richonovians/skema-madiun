import React from 'react';
import { Activity, LogIn, Edit3, XCircle } from 'lucide-react';

export default function AuditSummaryCards() {
  const summaries = [
    {
      title: 'Total Aktivitas Hari Ini',
      value: '1,248',
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      trend: '+12% dari kemarin'
    },
    {
      title: 'Total Login',
      value: '432',
      icon: LogIn,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      trend: '+5% dari kemarin'
    },
    {
      title: 'Perubahan Data',
      value: '86',
      icon: Edit3,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      trend: 'Normal'
    },
    {
      title: 'Aktivitas Gagal',
      value: '12',
      icon: XCircle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      trend: '-2% dari kemarin'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-md mb-lg">
      {summaries.map((item, index) => (
        <div key={index} className="bg-surface p-lg rounded-2xl border border-outline-variant shadow-sm flex flex-col">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-3 rounded-xl ${item.bgColor} ${item.color}`}>
              <item.icon size={20} />
            </div>
            <h3 className="text-sm font-semibold text-slate-500">{item.title}</h3>
          </div>
          <div className="mt-auto">
            <p className="text-3xl font-bold text-slate-900">{item.value}</p>
            <p className="text-xs text-slate-400 mt-2">{item.trend}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
