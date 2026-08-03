'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import AuditDetailHeader from '@/features/audit-logs/components/AuditDetailHeader';
import AuditInformation from '@/features/audit-logs/components/AuditInformation';
import AuditObjectInformation from '@/features/audit-logs/components/AuditObjectInformation';
import AuditChanges from '@/features/audit-logs/components/AuditChanges';
import AuditMetadata from '@/features/audit-logs/components/AuditMetadata';
import { auditLogsApi } from '@/features/audit-logs/services/auditLogs.api';
import { AlertCircle } from 'lucide-react';

export default function AdminKabAuditLogDetailPage() {
  const params = useParams();
  const id = params?.id;

  const [log, setLog] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchLogDetail = async () => {
      setIsLoading(true);
      try {
        const data = await auditLogsApi.getAuditLogDetail(id);
        setLog(data);
      } catch (err) {
        console.error('Failed to fetch log details', err);
        setError('Data audit log tidak ditemukan atau terjadi kesalahan server.');
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchLogDetail();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="p-lg w-full max-w-5xl mx-auto min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 font-medium">Memuat detail audit...</p>
        </div>
      </div>
    );
  }

  if (error || !log) {
    return (
      <div className="p-lg w-full max-w-5xl mx-auto space-y-md">
        <AuditDetailHeader logId={id} />
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 flex flex-col items-center text-center">
          <AlertCircle size={48} className="text-red-400 mb-4" />
          <h2 className="text-xl font-bold text-red-800 mb-2">Terjadi Kesalahan</h2>
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-lg w-full max-w-5xl mx-auto pb-24">
      <AuditDetailHeader logId={log.id} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        <div className="lg:col-span-2 flex flex-col gap-md">
          <AuditInformation log={log} />
          <AuditObjectInformation log={log} />
        </div>
        
        <div className="lg:col-span-1">
          <AuditMetadata log={log} />
        </div>
      </div>

      <div className="w-full">
        <AuditChanges log={log} />
      </div>
    </div>
  );
}
