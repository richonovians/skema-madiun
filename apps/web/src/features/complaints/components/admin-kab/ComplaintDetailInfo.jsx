import React from 'react';
import { Building2, UserCircle, CalendarClock, ShieldCheck } from 'lucide-react';

export default function ComplaintDetailInfo({ complaint }) {
  // Mock data for display purposes
  const adminPic = "Bapak Agus (Admin OPD)";
  const firstResponse = "19 Juli 2026, 14:30 WIB";
  
  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant p-lg">
      <h3 className="text-title-md font-bold text-on-surface mb-md pb-sm border-b border-outline-variant">
        Informasi Penanganan (OPD)
      </h3>
      
      <div className="space-y-md">
        <div className="flex items-start gap-md">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
            <Building2 size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Instansi Tujuan</p>
            <p className="text-body-md font-bold text-slate-800">{complaint.opd?.name || '-'}</p>
          </div>
        </div>

        <div className="flex items-start gap-md">
          <div className="p-2 bg-slate-50 text-slate-600 rounded-lg">
            <UserCircle size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Penanggung Jawab</p>
            <p className="text-body-md font-medium text-slate-800">{adminPic}</p>
          </div>
        </div>

        <div className="flex items-start gap-md">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <CalendarClock size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Waktu Respon Pertama</p>
            <p className="text-body-md font-medium text-slate-800">{firstResponse}</p>
          </div>
        </div>

        <div className="flex items-start gap-md">
          <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Kategori & Prioritas</p>
            <p className="text-body-md font-medium text-slate-800">
              {complaint.category || '-'} • <span className="font-bold">{complaint.priority || '-'}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
