'use client';

import React, { useCallback, useMemo, useState } from 'react';
import OPDHeader from '@/features/opd/components/OPDHeader';
import OPDFilterBar from '@/features/opd/components/OPDFilterBar';
import OPDTable from '@/features/opd/components/OPDTable';
import Pagination from '@/components/ui/Pagination';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getOpdList, syncOpd } from '@/features/opd/services/opd.api';

const ITEMS_PER_PAGE = 10;
const FETCH_LIMIT = 100;

export default function ManajemenOPDPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [syncNotice, setSyncNotice] = useState(null);

  const fetchOpd = useCallback(() => getOpdList({ limit: FETCH_LIMIT }), []);
  const { data: response, isLoading, error, refetch } = useAsync(fetchOpd);

  // Opsi jenis layanan DIDERIVASI dari data asli (bukan hardcode) -- backend
  // tak punya enum tetap utk `jenisLayanan` (lihat OPDFilterBar.jsx).
  const serviceOptions = useMemo(() => {
    const unique = [...new Set((response?.data ?? []).map((o) => o.serviceType).filter(Boolean))].sort();
    return [
      { value: '', label: 'Semua Jenis Layanan' },
      ...unique.map((s) => ({ value: s, label: s })),
    ];
  }, [response]);

  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (response?.data ?? []).filter((opd) => {
      const matchSearch =
        opd.name.toLowerCase().includes(q) || opd.code.toLowerCase().includes(q);
      const matchService = selectedService === '' || opd.serviceType === selectedService;
      return matchSearch && matchService;
    });
  }, [response, searchQuery, selectedService]);

  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleServiceChange = (val) => {
    setSelectedService(val);
    setCurrentPage(1);
  };

  /**
   * Setel ulang SEMUA penyaring tabel ini (2 September 2026). Halaman paginasi
   * ikut dikembalikan ke 1: tanpa itu, pengguna yang sedang di halaman 4 dari
   * hasil tersaring akan mendarat di halaman 4 dari daftar penuh -- benar
   * secara data, tapi terlihat seperti reset yang tak berfungsi karena tabelnya
   * tetap tak menampilkan baris paling awal.
   */
  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedService('');
    setCurrentPage(1);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncError(null);
    setSyncNotice(null);
    try {
      const report = await syncOpd();
      setSyncNotice(
        `Sinkron selesai: ${report.fetched} diambil, ${report.created} baru, ${report.updated} diperbarui, ${report.deactivated} dinonaktifkan.`,
      );
      await refetch();
    } catch (err) {
      setSyncError(err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  if (isLoading) {
    return <LoadingState label="Memuat data OPD..." />;
  }

  if (error) {
    return <ErrorState title="Gagal memuat data OPD" description={error.message} onRetry={refetch} />;
  }

  return (
    <div className="p-lg max-w-container-max w-full mx-auto flex-1 flex flex-col min-h-full">
      <OPDHeader onSync={handleSync} isSyncing={isSyncing} />

      {syncNotice && (
        <div className="mb-lg p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-sm font-medium">
          {syncNotice}
        </div>
      )}
      {syncError && (
        <div className="mb-lg p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          Gagal sinkronisasi: {syncError}
        </div>
      )}

      <OPDFilterBar
        searchQuery={searchQuery}
        setSearchQuery={handleSearchChange}
        selectedService={selectedService}
        setSelectedService={handleServiceChange}
        serviceOptions={serviceOptions}
        onReset={handleResetFilters}
      />
      <div className="flex-1 flex flex-col min-h-0">
        <OPDTable
          data={paginatedData}
          pagination={
            totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
                onPageChange={setCurrentPage}
                itemName="OPD"
              />
            )
          }
        />
      </div>
    </div>
  );
}
