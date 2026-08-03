'use client';

import React, { useState, useMemo } from 'react';
import UsersRoleFilter from '@/features/users/components/UsersRoleFilter';
import UsersTable from '@/features/users/components/UsersTable';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import { DUMMY_USERS } from '@/features/users/constants/dummyUsers';

export default function ManajemenUsersPage() {
  const [activeRoleFilter, setActiveRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Filter Data
  const filteredData = useMemo(() => {
    return DUMMY_USERS.filter((user) => {
      const matchRole = activeRoleFilter === 'ALL' || user.role === activeRoleFilter;
      const matchSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      return matchRole && matchSearch;
    });
  }, [activeRoleFilter, searchQuery]);

  // Pagination Logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  // Reset page when filter changes
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeRoleFilter, searchQuery]);

  return (
    <div className="p-lg flex flex-col min-h-0 flex-1 w-full max-w-container-max mx-auto">
      {/* 
        Catatan: searchQuery state sudah disiapkan di page ini (local state). 
        Untuk sementara waktu, tidak ada input text lokal karena sesuai instruksi, 
        input text ada di AdminNavbar. 
        Apabila nanti Navbar dapat menerima prop onSearch, state ini bisa dihubungkan ke sana,
        atau kita bisa menambahkan local search bar di sini jika dibutuhkan.
      */}
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-lg gap-4">
        <UsersRoleFilter 
          activeRoleFilter={activeRoleFilter}
          setActiveRoleFilter={setActiveRoleFilter}
        />
        <Button variant="primary-box" className="shadow-md px-6 py-3 w-full md:w-auto">
          <Plus size={20} />
          <span>Buat Akun Admin Baru</span>
        </Button>
      </div>
      
      <div className="flex-1 flex flex-col min-h-0 mt-xs">
        <UsersTable 
          data={paginatedData} 
          pagination={
            totalItems > 0 && (
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
                itemName="pengguna"
              />
            )
          }
        />
      </div>
    </div>
  );
}
