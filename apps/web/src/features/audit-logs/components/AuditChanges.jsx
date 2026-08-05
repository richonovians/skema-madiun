import React from 'react';
import { FileDiff } from 'lucide-react';

/**
 * SEBELUMNYA panel "Old Value / New Value" berdampingan -- backend TIDAK
 * simpan diff terstruktur semacam itu sama sekali. AuditInterceptor cuma
 * mencatat `{ params, body }` mentah dari request (lihat
 * apps/api/src/common/interceptors/audit.interceptor.ts) -- payload yang
 * DIKIRIM, bukan hasil bandingan sebelum/sesudah. Ditampilkan apa adanya
 * sbg satu panel "Payload Permintaan", bukan dikarang jadi diff dua kolom.
 */
export default function AuditChanges({ log }) {
  if (!log.body || Object.keys(log.body).length === 0) return null;

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden mt-md">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <FileDiff size={18} className="text-slate-500" />
        <h2 className="text-title-md font-bold text-slate-800">Payload Permintaan</h2>
      </div>

      <div className="p-lg">
        <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
          <div className="p-4 overflow-x-auto">
            <pre className="text-sm font-mono text-slate-700 whitespace-pre-wrap">
              {JSON.stringify(log.body, null, 2)}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
