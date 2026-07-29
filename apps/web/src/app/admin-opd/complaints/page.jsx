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
    console.log("Exporting to Excel...");
  };

  const handleExportPDF = () => {
    console.log("Exporting to PDF...");
  };

  return (
    <div className="w-full space-y-6">
      <ComplaintListHeader 
        totalComplaints={dummyComplaints.length}
        onExportExcel={handleExportExcel}
        onExportPDF={handleExportPDF}
      />
      
      <div className="bg-surface rounded-xl shadow-2xl border border-outline-variant overflow-hidden">
        <ComplaintListFilter 
          searchQuery={searchQuery}
          onSearchChange={handleSearchChange}
          statusFilter={statusFilter}
          onStatusChange={handleStatusChange}
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
