'use client';

import React, { useState, useEffect } from 'react';
import AuditSummaryCards from '@/features/audit-logs/components/AuditSummaryCards';
import AuditFilterBar from '@/features/audit-logs/components/AuditFilterBar';
import AuditTable from '@/features/audit-logs/components/AuditTable';
import Pagination from '@/components/ui/Pagination';
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

  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      setIsLoading(true);
      try {
        const response = await auditLogsApi.getAuditLogs(filters);
        setData(response.data);
        setTotal(response.total);
      } catch (error) {
        console.error('Failed to fetch audit logs', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLogs();
  }, [filters]);

  const totalPages = Math.ceil(total / filters.limit) || 1;

  return (
    <div className="p-lg w-full max-w-7xl mx-auto space-y-md pb-24">
      <AuditSummaryCards />
      
      <AuditFilterBar filters={filters} setFilters={setFilters} />
      
      {isLoading ? (
        <div className="flex justify-center p-12">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
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
        </>
      )}
    </div>
  );
}
