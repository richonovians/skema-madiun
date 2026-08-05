'use client';

import React, { useCallback } from 'react';
import { useParams } from 'next/navigation';
import AuditDetailHeader from '@/features/audit-logs/components/AuditDetailHeader';
import AuditInformation from '@/features/audit-logs/components/AuditInformation';
import AuditObjectInformation from '@/features/audit-logs/components/AuditObjectInformation';
import AuditChanges from '@/features/audit-logs/components/AuditChanges';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getAuditLogDetail } from '@/features/audit-logs/services/auditLogs.api';

export default function AdminKabAuditLogDetailPage() {
  const params = useParams();
  const id = params?.id;

  const fetchLogDetail = useCallback(() => getAuditLogDetail(id), [id]);
  const { data: log, isLoading, error, refetch } = useAsync(fetchLogDetail);

  return (
    <div className="p-lg w-full max-w-5xl mx-auto pb-24">
      <AuditDetailHeader logId={log?.id ?? id} />

      {isLoading ? (
        <LoadingState label="Memuat detail audit..." />
      ) : error ? (
        <ErrorState
          title="Gagal memuat detail audit"
          description={error.message}
          onRetry={refetch}
        />
      ) : (
        <div className="flex flex-col gap-md">
          <AuditInformation log={log} />
          <AuditObjectInformation log={log} />
          <AuditChanges log={log} />
        </div>
      )}
    </div>
  );
}
