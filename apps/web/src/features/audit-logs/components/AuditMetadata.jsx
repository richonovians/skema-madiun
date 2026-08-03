import React from 'react';
import { Terminal, Globe, Monitor, Laptop, Server, Key } from 'lucide-react';

export default function AuditMetadata({ log }) {
  return (
    <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden h-full mt-md lg:mt-0">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <Terminal size={18} className="text-slate-500" />
        <h2 className="text-title-md font-bold text-slate-800">Metadata Teknis</h2>
      </div>
      
      <div className="p-lg space-y-4">
        
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <Globe size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">IP Address</span>
            <p className="text-sm font-mono font-semibold text-slate-800">{log.ipAddress || '-'}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <Monitor size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Browser</span>
            <p className="text-sm font-semibold text-slate-800">{log.browser || '-'}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <Laptop size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sistem Operasi</span>
            <p className="text-sm font-semibold text-slate-800">{log.operatingSystem || '-'}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <Server size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Jenis Perangkat</span>
            <p className="text-sm font-semibold text-slate-800">{log.device || '-'}</p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
            <Key size={16} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Session ID</span>
            <p className="text-xs font-mono font-semibold text-slate-500 break-all">{log.sessionId || '-'}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
