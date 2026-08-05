import React from 'react';
import Link from 'next/link';
import Badge from '@/components/ui/Badge';
import { Eye, Clock } from 'lucide-react';
import Button from '@/components/ui/Button';

const ACTION_VARIANT = {
  CREATE: 'success',
  UPDATE: 'warning',
  DELETE: 'danger',
  'UPDATE STATUS': 'warning',
};

export default function AuditTable({ data, pagination }) {
  const getActionBadge = (action) => (
    <Badge variant={ACTION_VARIANT[action] ?? 'default'}>{action}</Badge>
  );

  const formatDate = (isoString) => {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!data || data.length === 0) {
    return (
      <div className="bg-surface rounded-2xl border border-outline-variant shadow-sm p-12 text-center">
        <Clock className="mx-auto h-12 w-12 text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-700">Tidak ada log aktivitas</h3>
        <p className="text-slate-500 mt-1">Coba sesuaikan filter modul Anda.</p>
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
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Modul</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Aktivitas</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant">
            {data.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                <td className="p-4 align-top">
                  <div className="text-sm font-medium text-slate-800">{formatDate(log.createdAt)}</div>
                  <div className="text-xs text-slate-400 mt-0.5">#{log.id}</div>
                </td>
                <td className="p-4 align-top">
                  <div className="text-sm font-bold text-slate-800">{log.user}</div>
                </td>
                <td className="p-4 align-top">
                  <div className="text-sm font-semibold text-slate-700">{log.module}</div>
                </td>
                <td className="p-4 align-top">
                  <div className="mb-2">{getActionBadge(log.action)}</div>
                  <div className="text-xs text-slate-600 line-clamp-2">{log.summary}</div>
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
