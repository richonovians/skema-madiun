import React from 'react';
import { Target, Box } from 'lucide-react';

/**
 * "objectType"/"objectId" versi dummy diganti data asli: `params` route
 * mentah (mis. `{ id: "5" }` atau `{ surveyId: "5" }`, tergantung rute) --
 * backend TIDAK punya field objectId tunggal terpisah, cuma params request
 * asli (lihat AuditInterceptor). Jenis objek sudah tercermin dari "Modul"
 * di AuditInformation, tak perlu diulang di sini.
 */
export default function AuditObjectInformation({ log }) {
  if (!log.params || Object.keys(log.params).length === 0) return null;

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden shrink-0">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <Target size={18} className="text-slate-500" />
        <h2 className="text-title-md font-bold text-slate-800">Target Objek</h2>
      </div>

      <div className="p-lg">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
          <Box size={12} /> Parameter Rute
        </span>
        <pre className="text-sm font-mono text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 whitespace-pre-wrap">
          {JSON.stringify(log.params, null, 2)}
        </pre>
      </div>
    </div>
  );
}
