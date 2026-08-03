import React from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { Eye, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function AuditTable({ data, pagination }) {
  const getActionBadge = (action) => {
    switch (action) {
      case 'CREATE': return <Badge variant="success">CREATE</Badge>;
      case 'UPDATE': return <Badge variant="warning">UPDATE</Badge>;
      case 'DELETE': return <Badge variant="danger">DELETE</Badge>;
      case 'LOGIN': return <Badge variant="info">LOGIN</Badge>;
      default: return <Badge variant="default">{action}</Badge>;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUCCESS': return <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div> Sukses</span>;
      case 'FAILED': return <span className="inline-flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full"><div className="w-1.5 h-1.5 rounded-full bg-red-500"></div> Gagal</span>;
      default: return <span className="text-xs text-slate-500">{status}</span>;
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', { 
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-12 text-center">
        <Clock className="mx-auto h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700">Tidak ada log aktivitas</h3>
        <p className="text-slate-500 mt-1">Coba sesuaikan filter pencarian Anda.</p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-outline-variant">
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Waktu</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Pengguna</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Modul & Objek</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Aktivitas</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Status</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {data.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 align-top">
                  <div className="text-sm font-medium text-slate-800">{formatDate(log.createdAt)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{log.id}</div>
                </td>
                <td className="p-4 align-top">
                  <div className="text-sm font-bold text-slate-800">{log.user}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{log.role}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">{log.opd}</div>
                </td>
                <td className="p-4 align-top">
                  <div className="text-sm font-semibold text-slate-700">{log.module}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{log.objectType}: {log.objectId}</div>
                </td>
                <td className="p-4 align-top">
                  <div className="mb-2">{getActionBadge(log.action)}</div>
                  <div className="text-xs text-slate-600 line-clamp-2">{log.description}</div>
                </td>
                <td className="p-4 align-top text-left">
                  {getStatusBadge(log.status)}
                </td>
                <td className="p-4 align-top text-left">
                  <Link href={`/admin-kab/audit-logs/${log.id}`}>
                    <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-0">
                      <Eye size={16} className="mr-2" /> Detail
                    </Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {pagination}
    </div>
  );
}
