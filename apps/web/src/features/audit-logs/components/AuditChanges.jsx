import React from 'react';
import { FileDiff, ArrowRight } from 'lucide-react';

export default function AuditChanges({ log }) {
  if (!log.oldValue && !log.newValue) return null; // No changes to show

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden mt-md">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <FileDiff size={18} className="text-slate-500" />
        <h2 className="text-title-md font-bold text-slate-800">Detail Perubahan</h2>
      </div>
      
      <div className="p-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative">
          {/* Decorative arrow for desktop */}
          <div className="hidden md:flex absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white rounded-full border border-slate-200 items-center justify-center text-slate-400 shadow-sm">
            <ArrowRight size={16} />
          </div>

          <div className="bg-red-50/50 rounded-xl border border-red-100 overflow-hidden">
            <div className="bg-red-100/50 px-4 py-2 border-b border-red-100">
              <span className="text-xs font-bold text-red-800">Data Sebelumnya (Old Value)</span>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
                {log.oldValue ? JSON.stringify(log.oldValue, null, 2) : <span className="text-slate-400 italic">Tidak ada data sebelumnya (Kosong)</span>}
              </pre>
            </div>
          </div>

          <div className="bg-emerald-50/50 rounded-xl border border-emerald-100 overflow-hidden mt-4 md:mt-0">
            <div className="bg-emerald-100/50 px-4 py-2 border-b border-emerald-100">
              <span className="text-xs font-bold text-emerald-800">Data Sesudahnya (New Value)</span>
            </div>
            <div className="p-4 overflow-x-auto">
              <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
                {log.newValue ? JSON.stringify(log.newValue, null, 2) : <span className="text-slate-400 italic">Data dihapus (Kosong)</span>}
              </pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
