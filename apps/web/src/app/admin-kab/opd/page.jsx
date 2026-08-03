'use client';

import React, { useState, useMemo } from 'react';
import OPDHeader from '@/features/opd/components/OPDHeader';
import OPDFilterBar from '@/features/opd/components/OPDFilterBar';
import OPDTable from '@/features/opd/components/OPDTable';
import Pagination from '@/components/ui/Pagination';
import { DUMMY_OPD } from '@/features/opd/constants/dummyOPD';

export default function ManajemenOPDPage() {
  const [opdData, setOpdData] = useState(DUMMY_OPD);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const handleUpdateStatus = (id, newStatus) => {
    setOpdData(prev => prev.map(item => 
      item.id === id ? { ...item, status: newStatus } : item
    ));
  };

  // Filter Data
  const filteredData = useMemo(() => {
    return opdData.filter((opd) => {
      const matchSearch = opd.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          opd.code.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchService = selectedService === '' || 
                           opd.serviceType.toLowerCase().includes(selectedService.toLowerCase());
      
      return matchSearch && matchService;
    });
  }, [searchQuery, selectedService, opdData]);

  // Pagination Logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedService]);

  return (
    <div className="p-lg max-w-container-max w-full mx-auto flex-1 flex flex-col min-h-full">
      <OPDHeader />
      <OPDFilterBar 
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedService={selectedService}
        setSelectedService={setSelectedService}
      />
      <div className="flex-1 flex flex-col min-h-0">
        <OPDTable data={paginatedData} onUpdateStatus={handleUpdateStatus} />
        {totalItems > 0 && (
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
