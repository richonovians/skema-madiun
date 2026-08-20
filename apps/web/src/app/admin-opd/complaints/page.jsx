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
import { getActingOpd } from '@/features/authentication/services/authStorage';
import { downloadTablePdf } from '@/utils/pdf';

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
  const [exportError, setExportError] = useState(null);

  // Dipersempit ke OPD yang diperankan superuser bila ada -- lihat catatan yang
  // sama di app/admin-opd/surveys/page.jsx.
  const fetchComplaints = useCallback(() => {
    const actingOpd = getActingOpd();
    return getComplaints({ limit: FETCH_LIMIT, ...(actingOpd ? { opdId: actingOpd.id } : {}) });
  }, []);
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

  /**
   * SEBELUMNYA mengunduh berkas .txt berisi catatan "ini simulasi ekspor teks"
   * -- pengguna menekan "PDF" tapi menerima teks. Kini PDF sungguhan lewat
   * utils/pdf.js (jsPDF, sudah jadi dependensi proyek).
   */
  const handleExportPDF = async () => {
    setExportError(null);
    try {
      await downloadTablePdf({
        filename: 'Data_Pengaduan.pdf',
        title: 'Laporan Pengaduan Masyarakat',
        subtitle: `${filteredComplaints.length} pengaduan`,
        columns: [
          { header: 'NO. TIKET', width: 2 },
          { header: 'JUDUL KELUHAN', width: 5 },
          { header: 'PELAPOR', width: 3 },
          { header: 'STATUS', width: 2 },
          { header: 'TANGGAL', width: 2 },
        ],
        rows: filteredComplaints.map((c) => [
          `#${c.id}`,
          c.title,
          c.reporter?.name,
          c.status,
          c.dateStr,
        ]),
        emptyLabel: 'Tidak ada pengaduan yang cocok dengan filter saat ini.',
      });
    } catch (err) {
      setExportError(err.message);
    }
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

      {exportError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          Gagal mengekspor: {exportError}
        </div>
      )}

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
