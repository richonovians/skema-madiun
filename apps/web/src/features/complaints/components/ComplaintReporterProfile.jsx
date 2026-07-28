import React from 'react';
import { User, IdCard, Phone, MapPin } from 'lucide-react';

export default function ComplaintReporterProfile({ reporter }) {
  if (!reporter) return null;

  return (
    <section className="bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
      {/* Header section */}
      <div className="bg-slate-50/80 p-lg border-b border-border/50 flex items-center justify-between">
        <h3 className="font-h3 text-h3 text-slate-800 font-bold">Profil Pelapor</h3>
        <div className="p-2 bg-white rounded-xl shadow-sm text-primary border border-slate-100">
          <User size={20} strokeWidth={2.5} />
        </div>
      </div>
      
      {/* Details section */}
      <div className="p-lg space-y-5">
        <div className="flex gap-4 items-start">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-lg mt-0.5">
            <User size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Nama Lengkap</span>
            <span className="text-sm font-semibold text-slate-800">{reporter.name}</span>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg mt-0.5">
            <IdCard size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">NIK</span>
            <span className="text-sm font-mono font-medium text-slate-700 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">{reporter.nik}</span>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg mt-0.5">
            <Phone size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">No. Telepon</span>
            <span className="text-sm font-medium text-slate-700">{reporter.phone}</span>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="p-2 bg-orange-50 text-orange-600 rounded-lg mt-0.5">
            <MapPin size={18} />
          </div>
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Alamat</span>
            <span className="text-sm font-medium text-slate-700 leading-relaxed">{reporter.address}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
