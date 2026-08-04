'use client';

import React, { useCallback, useState } from 'react';
import AuditSummaryCards from '@/features/audit-logs/components/AuditSummaryCards';
import AuditFilterBar from '@/features/audit-logs/components/AuditFilterBar';
import AuditTable from '@/features/audit-logs/components/AuditTable';
import Pagination from '@/components/ui/Pagination';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { auditLogsApi } from '@/features/audit-logs/services/auditLogs.api';

export default function AdminKabAuditLogsPage() {
  const [filters, setFilters] = useState({
    search: '',
    dateRange: '',
    module: 'Semua Modul',
    action: 'Semua Aktivitas',
    role: 'Semua Role',
    opd: 'Semua OPD',
    page: 1,
    limit: 10
  });

  const fetchLogs = useCallback(() => auditLogsApi.getAuditLogs(filters), [filters]);
  const { data: response, isLoading, error, refetch } = useAsync(fetchLogs);

  const data = response?.data ?? [];
  const total = response?.total ?? 0;
  const totalPages = Math.ceil(total / filters.limit) || 1;

  return (
    <div className="p-lg w-full max-w-7xl mx-auto space-y-md pb-24">
      <AuditSummaryCards />

      <AuditFilterBar filters={filters} setFilters={setFilters} />

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
              currentPage={filters.page}
              totalPages={totalPages}
              onPageChange={(page) => setFilters(prev => ({ ...prev, page }))}
              itemName="aktivitas"
            />
          }
        />
      )}
    </div>
  );
}
