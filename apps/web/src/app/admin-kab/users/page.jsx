'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import UsersRoleFilter from '@/features/users/components/UsersRoleFilter';
import UsersTable from '@/features/users/components/UsersTable';
import { Plus } from 'lucide-react';
import Button from '@/components/ui/Button';
import Pagination from '@/components/ui/Pagination';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getUsers, updateUserStatus } from '@/features/users/services/users.api';

const ITEMS_PER_PAGE = 10;
const FETCH_LIMIT = 100;

export default function ManajemenUsersPage() {
  const router = useRouter();
  const [activeRoleFilter, setActiveRoleFilter] = useState('ALL');
  // Belum ada input pencarian lokal di halaman ini (lihat catatan di JSX bawah)
  // -- state disiapkan utk saat Navbar bisa menyalurkan query pencarian.
  const [searchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionError, setActionError] = useState(null);

  const fetchUsers = useCallback(() => getUsers({ limit: FETCH_LIMIT }), []);
  const { data: response, isLoading, error, refetch } = useAsync(fetchUsers);

  // Filter Data
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (response?.data ?? []).filter((user) => {
      const matchRole = activeRoleFilter === 'ALL' || user.role === activeRoleFilter;
      const matchSearch =
        user.name.toLowerCase().includes(q) || user.email.toLowerCase().includes(q);
      return matchRole && matchSearch;
    });
  }, [response, activeRoleFilter, searchQuery]);

  // Pagination Logic
  const totalItems = filteredData.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE) || 1;
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedData = filteredData.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handleRoleFilterChange = (val) => {
    setActiveRoleFilter(val);
    setCurrentPage(1);
  };

  const handleUpdateStatus = async (userId, isActive) => {
    setActionError(null);
    try {
      await updateUserStatus(userId, isActive);
      await refetch();
    } catch (err) {
      setActionError(err.message);
    }
  };

  if (isLoading) {
    return <LoadingState label="Memuat data pengguna..." />;
  }

  if (error) {
    return (
      <ErrorState title="Gagal memuat pengguna" description={error.message} onRetry={refetch} />
    );
  }

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
          setActiveRoleFilter={handleRoleFilterChange}
        />
        <Button
          variant="primary-box"
          className="shadow-md px-6 py-3 w-full md:w-auto"
          onClick={() => router.push('/admin-kab/users/create')}
        >
          <Plus size={20} />
          <span>Buat Akun Admin Baru</span>
        </Button>
      </div>

      {actionError && (
        <div className="mb-lg p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
          {actionError}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0 mt-xs">
        <UsersTable
          data={paginatedData}
          onUpdateStatus={handleUpdateStatus}
          pagination={
            totalItems > 0 && (
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                itemsPerPage={ITEMS_PER_PAGE}
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
