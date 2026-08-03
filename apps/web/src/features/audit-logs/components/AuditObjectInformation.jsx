import React from 'react';
import { Target, Box, Hash } from 'lucide-react';

export default function AuditObjectInformation({ log }) {
  if (log.objectType === 'Session' || !log.objectType) return null; // No specific object for simple logins

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden shrink-0">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <Target size={18} className="text-slate-500" />
        <h2 className="text-title-md font-bold text-slate-800">Target Objek</h2>
      </div>
      
      <div className="p-lg grid grid-cols-2 gap-4">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Box size={12} /> Jenis Objek
          </span>
          <p className="text-sm font-semibold text-slate-800">{log.objectType || '-'}</p>
        </div>
        
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-1">
            <Hash size={12} /> ID Objek
          </span>
          <p className="text-sm font-mono font-semibold text-slate-800">{log.objectId || '-'}</p>
        </div>
      </div>
    </div>
  );
}
