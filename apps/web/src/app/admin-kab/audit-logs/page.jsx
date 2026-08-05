'use client';

import React, { useCallback, useState } from 'react';
import AuditSummaryCards from '@/features/audit-logs/components/AuditSummaryCards';
import AuditFilterBar from '@/features/audit-logs/components/AuditFilterBar';
import AuditTable from '@/features/audit-logs/components/AuditTable';
import Pagination from '@/components/ui/Pagination';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getAuditLogs } from '@/features/audit-logs/services/auditLogs.api';

const LIMIT = 10;

export default function AdminKabAuditLogsPage() {
  const [entitas, setEntitas] = useState('');
  const [page, setPage] = useState(1);

  const fetchLogs = useCallback(
    () => getAuditLogs({ entitas: entitas || undefined, page, limit: LIMIT }),
    [entitas, page],
  );
  const { data: response, isLoading, error, refetch } = useAsync(fetchLogs);

  const data = response?.data ?? [];
  const pagination = response?.meta?.pagination ?? { total: 0, totalPages: 1 };

  const handleEntitasChange = (val) => {
    setEntitas(val);
    setPage(1);
  };

  const handleReset = () => {
    setEntitas('');
    setPage(1);
  };

  return (
    <div className="p-lg w-full max-w-7xl mx-auto space-y-md pb-24">
      <AuditSummaryCards total={pagination.total} />

      <AuditFilterBar entitas={entitas} onEntitasChange={handleEntitasChange} onReset={handleReset} />

      {isLoading ? (
        <LoadingState label="Memuat log aktivitas..." />
      ) : error ? (
        <ErrorState
          title="Gagal memuat log aktivitas"
          description={error.message}
          onRetry={refetch}
        />
      ) : (
        <AuditTable
          data={data}
          pagination={
            <Pagination
              currentPage={page}
              totalPages={pagination.totalPages}
              totalItems={pagination.total}
              itemsPerPage={LIMIT}
              onPageChange={setPage}
              itemName="aktivitas"
            />
          }
        />
      )}
    </div>
  );
}
