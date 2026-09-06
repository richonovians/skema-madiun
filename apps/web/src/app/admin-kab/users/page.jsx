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
import ActiveAccountsInfo from '@/components/ui/ActiveAccountsInfo';
import {
  getUsers,
  getUserStats,
  updateUserStatus,
  deleteUser,
} from '@/features/users/services/users.api';

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

  // Diambil TERPISAH dan kegagalannya TIDAK menggagalkan halaman: angka ini
  // keterangan, sedangkan daftar akunnya isi utama. Menggabungkannya ke satu
  // Promise.all berarti satu endpoint yang bermasalah mengosongkan tabelnya.
  const fetchStats = useCallback(() => getUserStats(), []);
  const { data: stats } = useAsync(fetchStats);

  // Filter Data
  const filteredData = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return (response?.data ?? []).filter((user) => {
      // Menyaring KEPEMILIKAN: akun ber-role banyak cocok bila SALAH SATU
      // rolenya sesuai penyaring.
      const matchRole = activeRoleFilter === 'ALL' || user.roles.includes(activeRoleFilter);
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

  const handleDelete = async (userId) => {
    setActionError(null);
    try {
      await deleteUser(userId);
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

      {/* Menumpuk sampai `xl`, dulu `md`. Diukur, bukan dikira: penyaring peran
          butuh ~700px dan tombol ~275px, jadi keduanya baru benar-benar cukup
          sebaris pada area konten >=1000px -- yaitu sejak lebar layar 1280px.
          Pada `md` (768px) area kontennya hanya ~512px dan keduanya digencet:
          teks tombol terbelah empat baris, penyaringnya terpotong. Pada `lg`
          (1024px) penyaringnya membungkus jadi tiga baris. */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between mb-lg gap-4">
        {/* TANPA tombol "Reset Filter" -- diminta pengguna, 2 September 2026.
            Penyaring di halaman ini berupa tab peran yang salah satunya selalu
            aktif dan "Semua Pengguna" ada di paling kiri, jadi menetralkannya
            sudah satu ketukan; tombol reset hanya menduplikasi tab itu. */}
        <UsersRoleFilter
          activeRoleFilter={activeRoleFilter}
          setActiveRoleFilter={handleRoleFilterChange}
        />
        <Button
          variant="primary-box"
          // `shrink-0` + `whitespace-nowrap`: sebagai flex item tombol ini
          // menyusut secara baku sampai labelnya terbelah empat baris.
          className="shadow-md px-6 py-3 w-full xl:w-auto xl:shrink-0 whitespace-nowrap"
          onClick={() => router.push('/admin-kab/users/create')}
        >
          <Plus size={20} />
          <span>Buat Akun Admin Baru</span>
        </Button>
      </div>

      {/* BARIS SENDIRI, bukan anak baris tab+tombol di atas. Ketiganya bersama
          melebihi lebar layar 1440px sekalipun (tab ~700px + strip ~290px +
          tombol ~250px), jadi satu di antaranya PASTI mengalah: sebelum ini
          stripnya yang digencet sampai kalimatnya terbelah dua baris, dan
          begitu ia dibuat tak menyusut, tombol "Buat Akun Admin Baru" yang
          terlempar ke baris kedua. Diberi barisnya sendiri, tak ada yang
          mengalah -- dan letaknya sama dengan pada kedua dashboard. */}
      <div className="mb-lg">
        <ActiveAccountsInfo
          activeCount={stats?.activeUsers ?? null}
          totalCount={stats?.totalUsers ?? null}
          scope="all"
        />
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
          onDelete={handleDelete}
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
