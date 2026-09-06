'use client';

import React, { useCallback, useMemo, useState } from 'react';
import ComplaintOverviewCards from '@/features/complaints/components/admin-kab/ComplaintOverviewCards';
import ComplaintFilterBar from '@/features/complaints/components/admin-kab/ComplaintFilterBar';
import ComplaintTable from '@/features/complaints/components/admin-kab/ComplaintTable';
import ForwardComplaintModal from '@/features/complaints/components/admin-kab/ForwardComplaintModal';
import Pagination from '@/components/ui/Pagination';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getComplaints } from '@/features/complaints/services/complaints.api';
import { getComplaintCategories } from '@/features/complaints/services/reference.api';

const ITEMS_PER_PAGE = 5;
// Kabupaten melihat SEMUA pengaduan lintas OPD (ownershipWhere kosong utk role
// kabupaten, lihat ComplaintsService backend) -- ambil satu halaman besar lalu
// filter+paginasi di klien, backend belum py search/kategori bebas teks
// (pola sama INT-19/20).
const FETCH_LIMIT = 100;
/**
 * Nilai penyaring khusus untuk pengaduan yang BELUM bertujuan (6 September
 * 2026). Menumpang penyaring OPD yang sudah ada alih-alih menambah tab baru:
 * "OPD mana" dan "belum ada OPD" adalah pertanyaan yang sama, dan dua kendali
 * terpisah untuk satu pertanyaan hanya membuat keduanya bisa saling bertentangan.
 */
const TANPA_TUJUAN = 'tanpa-tujuan';

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

export default function AdminKabComplaintsPage() {
  const [filters, setFilters] = useState({ search: '', opd: '', status: '', kategori: '' });
  const [currentPage, setCurrentPage] = useState(1);
  // Pengaduan yang sedang diteruskan; null = modal tertutup.
  const [diteruskan, setDiteruskan] = useState(null);

  const fetchComplaints = useCallback(() => getComplaints({ limit: FETCH_LIMIT }), []);
  const { data: response, isLoading, error, refetch } = useAsync(fetchComplaints);

  const fetchCategories = useCallback(() => getComplaintCategories(), []);
  const { data: categories } = useAsync(fetchCategories);

  const categoryMap = useMemo(() => {
    const map = {};
    (categories ?? []).forEach((c) => {
      map[c.kode] = c.nama;
    });
    return map;
  }, [categories]);

  const categoryOptions = useMemo(
    () => [
      { value: '', label: 'Semua Kategori' },
      ...(categories ?? []).map((c) => ({ value: c.kode, label: c.nama })),
    ],
    [categories],
  );

  const opdOptions = useMemo(() => {
    const seen = new Map();
    (response?.data ?? []).forEach((c) => {
      if (c.opdId != null && c.target) {
        seen.set(String(c.opdId), c.target);
      }
    });
    const adaTanpaTujuan = (response?.data ?? []).some((c) => c.opdId == null);
    return [
      { value: '', label: 'Semua OPD' },
      // Hanya ditawarkan bila memang ada barisnya: penyaring yang selalu
      // menghasilkan daftar kosong membuat petugas mengira datanya hilang.
      ...(adaTanpaTujuan ? [{ value: TANPA_TUJUAN, label: 'Belum bertujuan' }] : []),
      ...Array.from(seen.entries()).map(([value, label]) => ({ value, label })),
    ];
  }, [response]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilters({ search: '', opd: '', status: '', kategori: '' });
    setCurrentPage(1);
  };

  const filteredComplaints = useMemo(() => {
    const q = filters.search.toLowerCase();
    return (response?.data ?? []).filter((complaint) => {
      const matchSearch =
        !q ||
        complaint.id.toLowerCase().includes(q) ||
        complaint.title.toLowerCase().includes(q) ||
        (complaint.reporter.name ?? '').toLowerCase().includes(q);

      const matchOpd =
        !filters.opd ||
        (filters.opd === TANPA_TUJUAN
          ? complaint.opdId == null
          : String(complaint.opdId) === filters.opd);
      const matchStatus = !filters.status || complaint.status === filters.status;
      const matchKategori = !filters.kategori || complaint.kategori === filters.kategori;

      return matchSearch && matchOpd && matchStatus && matchKategori;
    });
  }, [response, filters]);

  const totalItems = filteredComplaints.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;

  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredComplaints.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredComplaints, currentPage]);

  const handleExportExcel = () => {
    const headers = ['NO TIKET', 'OPD', 'KATEGORI', 'JUDUL', 'PELAPOR', 'STATUS', 'TANGGAL'];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const rows = filteredComplaints.map((c) =>
      [
        `#${c.id}`,
        c.target ?? '',
        categoryMap[c.kategori] ?? c.kategori ?? '',
        c.title,
        c.reporter?.name ?? '',
        c.status,
        c.dateStr,
      ]
        .map(escape)
        .join(','),
    );
    downloadBlob([headers.join(','), ...rows].join('\n'), 'text/csv;charset=utf-8;', 'data_pengaduan.csv');
  };

  const handleExportPDF = () => {
    window.print();
  };

  if (isLoading) {
    return <LoadingState label="Memuat data monitoring..." />;
  }

  if (error) {
    return (
      <ErrorState title="Gagal memuat data pengaduan" description={error.message} onRetry={refetch} />
    );
  }

  return (
    <div className="p-lg w-full space-y-6">
      <ComplaintOverviewCards complaints={response?.data ?? []} />

      <div className="bg-surface rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden">
        <ComplaintFilterBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
          opdOptions={opdOptions}
          categoryOptions={categoryOptions}
        />

        <ComplaintTable
          complaints={paginatedComplaints}
          categoryMap={categoryMap}
          onForward={setDiteruskan}
        />

        <div className="border-t border-slate-200 p-md">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={ITEMS_PER_PAGE}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {diteruskan && (
        <ForwardComplaintModal
          complaint={{ id: diteruskan.numericId ?? diteruskan.id, ticketNo: diteruskan.id }}
          onClose={() => setDiteruskan(null)}
          onDone={() => {
            setDiteruskan(null);
            // Daftar disegarkan dari server, bukan disunting di klien: tujuan
            // barunya beserta namanya berasal dari sana.
            refetch();
          }}
        />
      )}
    </div>
  );
}
