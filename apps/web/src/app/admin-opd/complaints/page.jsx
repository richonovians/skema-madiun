'use client';

import React, { useState, useMemo, useEffect } from 'react';
import ComplaintListHeader from '@/features/complaints/components/ComplaintListHeader';
import ComplaintListFilter from '@/features/complaints/components/ComplaintListFilter';
import AdminComplaintTable from '@/features/complaints/components/AdminComplaintTable';
import Pagination from '@/components/ui/Pagination';
import { dummyComplaints } from '@/features/complaints/constants/dummyComplaints';
import { Loader2 } from 'lucide-react';

export default function AdminOPDComplaintsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Semua Status');
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 5; // Reduced to 5 to demonstrate pagination with 14 items

  // Simulate loading state on filter change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, statusFilter, currentPage]);

  const filteredComplaints = useMemo(() => {
    return dummyComplaints.filter((complaint) => {
      const matchSearch = 
        complaint.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        complaint.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        complaint.reporter.name.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchStatus = statusFilter === 'Semua Status' || complaint.status === statusFilter;
      
      return matchSearch && matchStatus;
    });
  }, [searchQuery, statusFilter]);

  const totalItems = filteredComplaints.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredComplaints.slice(start, start + itemsPerPage);
  }, [filteredComplaints, currentPage, itemsPerPage]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    setCurrentPage(1); // Reset to first page
  };

  const handleStatusChange = (val) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleExportExcel = () => {
    // Generate dummy CSV data
    const csvContent = "ID Pengaduan,Judul,Pelapor,Status,Tanggal\nCOMP-001,Jalan Berlubang di Sudirman,Budi Santoso,Diproses,2026-08-01\nCOMP-002,Pelayanan KTP Lambat,Siti Aminah,Selesai,2026-08-02";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Data_Pengaduan.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = () => {
    // Generate dummy Text file as placeholder for PDF
    const textContent = "LAPORAN PENGADUAN MASYARAKAT\n\n1. COMP-001 - Jalan Berlubang (Diproses)\n2. COMP-002 - Pelayanan KTP (Selesai)\n\n*Catatan: Ekspor PDF asli memerlukan library tambahan (mis. jspdf) atau backend. Ini adalah simulasi ekspor teks.";
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'Data_Pengaduan.txt');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full space-y-6">
      <ComplaintListHeader 
        totalComplaints={dummyComplaints.length}
      />
      
      <div className="bg-surface rounded-xl shadow-2xl border border-outline-variant overflow-hidden">
        <ComplaintListFilter 
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        />
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p className="font-body-md">Memuat data pengaduan...</p>
          </div>
        ) : (
          <>
            <AdminComplaintTable complaints={paginatedComplaints} />
            
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
}
