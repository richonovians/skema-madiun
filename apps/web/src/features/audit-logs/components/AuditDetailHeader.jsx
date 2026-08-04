import React from 'react';
import Link from 'next/link';
import { ArrowLeft, History } from 'lucide-react';

export default function AuditDetailHeader({ logId }) {
  return (
    <div className="flex flex-col gap-4 mb-md">
      <div className="flex items-center gap-4">
        <Link 
          href="/admin-kab/audit-logs" 
          className="inline-flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <ArrowLeft size={18} />
          Kembali ke Daftar Audit
        </Link>
      </div>

      <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant p-lg flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-slate-100 text-slate-600 rounded-xl">
            <History size={24} />
          </div>
          <div>
            <h1 className="text-headline-sm font-bold text-slate-900 leading-tight">
              Detail Audit Log
            </h1>
            <p className="text-sm text-slate-500 font-mono mt-1">{logId}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
