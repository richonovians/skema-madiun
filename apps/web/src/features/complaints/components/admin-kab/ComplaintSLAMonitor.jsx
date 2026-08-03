import React from 'react';
import { Target, Timer, AlertTriangle, AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function ComplaintSLAMonitor({ complaint }) {
  const { sla } = complaint;
  if (!sla) return null;

  const getStatusDisplay = () => {
    if (sla.isOverdue) return { label: 'Melebihi Batas SLA', color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', icon: AlertCircle };
    if (sla.remainingHours <= 24) return { label: 'Mendekati Batas SLA', color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200', icon: AlertTriangle };
    return { label: 'Dalam Target SLA', color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle };
  };

  const status = getStatusDisplay();
  const StatusIcon = status.icon;

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className={`rounded-2xl shadow-sm border ${status.border} overflow-hidden`}>
      <div className={`px-lg py-md border-b ${status.border} ${status.bg} flex items-center justify-between`}>
        <div className="flex items-center gap-2">
          <Target size={18} className={status.color} />
          <h3 className={`text-title-md font-bold ${status.color}`}>
            SLA Monitor
          </h3>
        </div>
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white shadow-sm border ${status.border} text-xs font-bold ${status.color}`}>
          <StatusIcon size={14} />
          {status.label}
        </div>
      </div>
      
      <div className="p-lg bg-white space-y-6">
        
        {/* Progress Bar (Visual representation) */}
        {sla.totalDuration && sla.elapsed !== undefined && (
          <div>
            <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
              <span>Mulai</span>
              <span>Batas Akhir</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all ${
                  sla.isOverdue ? 'bg-red-500 w-full' : (sla.remainingHours <= 24 ? 'bg-yellow-500' : 'bg-emerald-500')
                }`}
                style={{ width: `${Math.min(100, (sla.elapsed / sla.totalDuration) * 100)}%` }}
              />
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Target Penyelesaian</span>
            <span className="text-sm font-semibold text-slate-800">{formatDate(sla.slaDeadline)}</span>
          </div>
          
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block mb-1">Waktu Tersisa</span>
            <div className="flex items-center gap-1.5">
              <Timer size={14} className={sla.isOverdue ? "text-red-500" : "text-slate-600"} />
              <span className={`text-sm font-semibold ${sla.isOverdue ? 'text-red-600' : 'text-slate-800'}`}>
                {sla.isOverdue ? `Terlewat ${Math.abs(sla.remainingHours)} Jam` : `${sla.remainingHours} Jam`}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
