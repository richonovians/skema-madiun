'use client';

import React, { useCallback, useMemo, useState } from 'react';
import ComplaintListHeader from '@/features/complaints/components/ComplaintListHeader';
import ComplaintListFilter from '@/features/complaints/components/ComplaintListFilter';
import AdminComplaintTable from '@/features/complaints/components/AdminComplaintTable';
import Pagination from '@/components/ui/Pagination';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getComplaints } from '@/features/complaints/services/complaints.api';

const ITEMS_PER_PAGE = 5;
// Backend TIDAK punya parameter pencarian bebas teks (lihat ListComplaintQueryDto
// -- cuma page/limit/status), jadi ambil satu halaman besar (maks limit backend)
// lalu search+paginasi dikerjakan di klien. Pola sama dgn INT-19 (getSurveys),
// aman untuk skala data OPD saat ini -- kalau volume tumbuh jauh lebih besar,
// ini kandidat kuat utk endpoint search sungguhan di backend.
const FETCH_LIMIT = 100;

function downloadBlob(content, mimeType, filename) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function AdminOPDComplaintsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  const [currentPage, setCurrentPage] = useState(1);

  const fetchComplaints = useCallback(() => getComplaints({ limit: FETCH_LIMIT }), []);
  const { data: response, isLoading, error, refetch } = useAsync(fetchComplaints);

  const filteredComplaints = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (response?.data ?? []).filter((complaint) => {
      const matchSearch =
        complaint.id.toLowerCase().includes(q) ||
        complaint.title.toLowerCase().includes(q) ||
        (complaint.reporter.name ?? '').toLowerCase().includes(q);
      const matchStatus = statusFilter === 'Semua Status' || complaint.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [response, searchQuery, statusFilter]);

  const totalItems = filteredComplaints.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredComplaints.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredComplaints, currentPage]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    const header = 'ID Pengaduan,Judul,Pelapor,Status,Tanggal';
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filteredComplaints.map((c) =>
      [c.id, c.title, c.reporter.name, c.status, c.dateStr].map(escape).join(','),
    );
    downloadBlob([header, ...rows].join('\n'), 'text/csv;charset=utf-8;', 'Data_Pengaduan.csv');
  };

  const handleExportPDF = () => {
    const lines = filteredComplaints.map(
      (c, i) => `${i + 1}. ${c.id} - ${c.title} (${c.status})`,
    );
    const textContent = `LAPORAN PENGADUAN MASYARAKAT\n\n${lines.join('\n')}\n\n*Catatan: Ekspor PDF asli memerlukan library tambahan (mis. jspdf) atau backend. Ini adalah simulasi ekspor teks.`;
    downloadBlob(textContent, 'text/plain;charset=utf-8;', 'Data_Pengaduan.txt');
  };

  if (isLoading) {
    return <LoadingState label="Memuat data pengaduan..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Gagal memuat pengaduan"
        description={error.message}
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="w-full space-y-6">
      <ComplaintListHeader totalComplaints={totalItems} />

      <div className="bg-surface rounded-xl shadow-2xl border border-outline-variant overflow-hidden">
        <ComplaintListFilter
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        />

        <AdminComplaintTable complaints={paginatedComplaints} />

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
}
