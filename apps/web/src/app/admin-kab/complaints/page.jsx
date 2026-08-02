'use client';

import React, { useState, useMemo, useEffect } from 'react';
import ComplaintOverviewCards from '@/features/complaints/components/admin-kab/ComplaintOverviewCards';
import ComplaintFilterBar from '@/features/complaints/components/admin-kab/ComplaintFilterBar';
import ComplaintTable from '@/features/complaints/components/admin-kab/ComplaintTable';
import Pagination from '@/components/ui/Pagination';
import { dummyComplaintsKabupaten } from '@/features/complaints/constants/dummyComplaintsKabupaten';
import { Loader2 } from 'lucide-react';

export default function AdminKabComplaintsPage() {
  const [filters, setFilters] = useState({
    search: '',
    opd: '',
    status: '',
    priority: '',
    category: '',
    dateRange: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const itemsPerPage = 5;

  // Simulate loading state on filter change
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 400);
    return () => clearTimeout(timer);
  }, [filters, currentPage]);

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page
  };

  const handleResetFilters = () => {
    setFilters({
      search: '',
      opd: '',
      status: '',
      priority: '',
      category: '',
      dateRange: ''
    });
    setCurrentPage(1);
  };

  const filteredComplaints = useMemo(() => {
    return dummyComplaintsKabupaten.filter((complaint) => {
      const q = filters.search.toLowerCase();
      const matchSearch = !q ||
        complaint.id.toLowerCase().includes(q) ||
        complaint.title.toLowerCase().includes(q) ||
        complaint.reporter.name.toLowerCase().includes(q);
      
      const matchOpd = !filters.opd || complaint.opd?.id.toString() === filters.opd;
      const matchStatus = !filters.status || complaint.status === filters.status;
      const matchPriority = !filters.priority || complaint.priority === filters.priority;
      const matchCategory = !filters.category || complaint.category?.toLowerCase().includes(filters.category.toLowerCase());
      
      return matchSearch && matchOpd && matchStatus && matchPriority && matchCategory;
    });
  }, [filters]);

  const totalItems = filteredComplaints.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  
  const paginatedComplaints = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredComplaints.slice(start, start + itemsPerPage);
  }, [filteredComplaints, currentPage, itemsPerPage]);

  const handleExportExcel = () => {
    console.log("Exporting to Excel...");
  };

  const handleExportPDF = () => {
    console.log("Exporting to PDF...");
  };

  return (
    <div className="p-lg w-full space-y-6">


      {/* Executive Summary Cards */}
      <ComplaintOverviewCards complaints={dummyComplaintsKabupaten} />
      
      <div className="bg-surface rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 overflow-hidden">
        {/* Advanced Filters */}
        <ComplaintFilterBar 
          filters={filters}
          onFilterChange={handleFilterChange}
          onResetFilters={handleResetFilters}
          onExportExcel={handleExportExcel}
          onExportPDF={handleExportPDF}
        />
        
        {/* Table Area */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-text-secondary">
            <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
            <p className="font-body-md">Memuat data monitoring...</p>
          </div>
        ) : (
          <>
            <ComplaintTable complaints={paginatedComplaints} />
            
            <div className="border-t border-slate-200 p-md">
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
