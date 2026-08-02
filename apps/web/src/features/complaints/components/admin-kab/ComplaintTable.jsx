import React from 'react';
import Badge from '@/components/ui/Badge';
import Link from 'next/link';
import { AlertCircle, Clock, CheckCircle } from 'lucide-react';

export default function ComplaintTable({ complaints }) {
  const getStatusVariant = (status) => {
    switch (status) {
      case 'Selesai': return 'success';
      case 'Diproses': return 'warning';
      case 'Ditolak': return 'danger';
      case 'Diterima': return 'info';
      default: return 'default';
    }
  };

  const getPriorityVariant = (priority) => {
    switch (priority) {
      case 'Tinggi': return 'danger';
      case 'Sedang': return 'warning';
      case 'Rendah': return 'success';
      default: return 'default';
    }
  };

  const getSLAIndicator = (sla) => {
    if (!sla) return <div className="flex items-center justify-center gap-1 text-slate-400"><span className="w-2 h-2 rounded-full bg-slate-300"></span> -</div>;
    if (sla.isOverdue) return <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-red-50 text-red-600 text-xs font-bold border border-red-100"><AlertCircle size={14} /> Melebihi SLA</div>;
    if (sla.remainingHours <= 24) return <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-yellow-50 text-yellow-600 text-xs font-bold border border-yellow-100"><Clock size={14} /> Mendekati Batas</div>;
    return <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-emerald-600 text-xs font-bold border border-emerald-100"><CheckCircle size={14} /> Dalam SLA</div>;
  };

  const formatProgress = (progress) => {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div 
            className={`h-full ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`} 
            style={{ width: `${progress || 0}%` }}
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">{progress || 0}%</span>
      </div>
    );
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="bg-surface-container text-on-surface-variant">
          <tr>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">NO. TIKET</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">OPD & KATEGORI</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">JUDUL KELUHAN</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">TANGGAL & UMUR</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider">STATUS & PROGRESS</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider text-center">SLA</th>
            <th className="px-lg py-md font-label-md text-label-md uppercase tracking-wider text-left">AKSI</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-outline-variant">
          {complaints.length === 0 ? (
            <tr>
              <td colSpan="7" className="text-center py-xl text-text-secondary">
                Tidak ada data pengaduan yang ditemukan.
              </td>
            </tr>
          ) : (
            complaints.map((complaint) => (
              <tr key={complaint.id} className="hover:bg-slate-50 transition-colors group">
                <td className="px-lg py-lg">
                  <div className="font-mono text-sm font-bold text-primary">#{complaint.id}</div>
                  <Badge variant={getPriorityVariant(complaint.priority)} className="mt-1 px-1.5 py-0 text-[10px]">
                    {complaint.priority}
                  </Badge>
                </td>
                
                <td className="px-lg py-lg">
                  <div className="font-body-md text-body-md font-bold text-slate-800">{complaint.opd?.name || '-'}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{complaint.category || '-'}</div>
                  {complaint.kecamatan && (
                    <div className="text-xs text-slate-400 mt-0.5">Kec. {complaint.kecamatan}</div>
                  )}
                </td>
                
                <td className="px-lg py-lg max-w-xs">
                  <p className="font-body-md text-body-md text-on-surface line-clamp-2" title={complaint.title}>
                    {complaint.title}
                  </p>
                  <div className="text-xs text-slate-500 mt-1">Pelapor: {complaint.reporter?.name}</div>
                </td>
                
                <td className="px-lg py-lg">
                  <div className="font-body-md text-body-md text-on-surface-variant">{complaint.dateStr}</div>
                  <div className="text-xs font-medium text-slate-500 mt-1">Umur: {complaint.ageDays} hari</div>
                </td>
                
                <td className="px-lg py-lg">
                  <Badge variant={getStatusVariant(complaint.status)}>
                    {complaint.status}
                  </Badge>
                  <div className="mt-2">
                    {formatProgress(complaint.progress)}
                  </div>
                </td>
                
                <td className="px-lg py-lg text-center">
                  {getSLAIndicator(complaint.sla)}
                  {complaint.sla?.remainingHours !== undefined && (
                    <div className="text-[10px] text-slate-400 mt-1">
                      {complaint.sla.remainingHours > 0 ? `${complaint.sla.remainingHours}j tersisa` : 'Terlewat'}
                    </div>
                  )}
                </td>
                
                <td className="px-lg py-lg text-left">
                  <Link href={`/admin-kab/complaints/${complaint.id}`}>
                    <button className="px-md py-1.5 text-primary border border-primary rounded-lg font-label-md text-label-md hover:bg-primary hover:text-white transition-all">
                      Monitor Tiket
                    </button>
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
