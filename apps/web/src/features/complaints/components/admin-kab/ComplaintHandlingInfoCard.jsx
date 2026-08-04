import React from 'react';
import { Building2, UserCircle, CalendarClock, ShieldCheck } from 'lucide-react';

export default function ComplaintHandlingInfoCard({ complaint }) {
  // Using some dummy static dates for "dibaca" and "direspons" if not available in data
  const firstRead = complaint.stats?.timeToVerify ? "Sistem Otomatis (Segera)" : "18 Juli 2026, 08:35 WIB";
  const firstResponse = complaint.timeline?.find(t => t.id === 4)?.date || "Belum direspons";

  const formatDate = (isoString) => {
    if (!isoString || isoString === "Belum direspons" || isoString.includes("Sistem")) return isoString;
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) + ' WIB';
  };

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50">
        <h3 className="text-title-md font-bold text-slate-800">
          Informasi Penanganan (OPD)
        </h3>
      </div>
      
      <div className="p-lg space-y-md">
        <div className="flex items-start gap-md">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Instansi Pelaksana</p>
            <p className="text-body-md font-bold text-slate-800">{complaint.opd?.name || '-'}</p>
          </div>
        </div>

        <div className="flex items-start gap-md">
          <div className="p-2 bg-slate-50 text-slate-600 rounded-lg shrink-0">
            <UserCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Penanggung Jawab (PIC)</p>
            <p className="text-body-md font-medium text-slate-800">{complaint.opd?.pic || '-'}</p>
          </div>
        </div>

        <div className="flex items-start gap-md">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg shrink-0">
            <CalendarClock size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Pertama Dibaca (Verifikasi)</p>
            <p className="text-body-md font-medium text-slate-800">{formatDate(firstRead)}</p>
          </div>
        </div>

        <div className="flex items-start gap-md">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Respons Pertama OPD</p>
            <p className="text-body-md font-medium text-slate-800">{formatDate(firstResponse)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
