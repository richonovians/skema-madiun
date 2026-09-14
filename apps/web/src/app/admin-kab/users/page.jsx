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
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import {
  getUsers,
  getUserStats,
  updateUserStatus,
  deleteUser,
} from '@/features/users/services/users.api';

const ITEMS_PER_PAGE = 10;
const FETCH_LIMIT = 100;

/**
 * Naskah konfirmasi per aksi akun (8 September 2026), pola yang sama dengan
 * `CONFIRM_COPY` di admin-kab/surveys/page.jsx: tiap aksi punya peringatan yang
 * jujur sesuai akibatnya di backend, bukan satu pesan generik.
 *
 * Sebelum ini Nonaktifkan tak punya gerbang sama sekali, dan Hapus memakai
 * `window.confirm` bawaan peramban.
 */
const CONFIRM_COPY = {
  deactivate: {
    title: 'Nonaktifkan akun ini?',
    description: (user) =>
      `"${user.name}" tidak akan dapat masuk ke SKEMA sampai diaktifkan kembali. Data, pengaduan, dan jawaban surveinya tetap tersimpan.`,
    confirmLabel: 'Ya, Nonaktifkan',
    tone: 'danger',
  },
  activate: {
    title: 'Aktifkan kembali akun ini?',
    description: (user) =>
      `"${user.name}" akan dapat masuk kembali dengan peran yang sekarang dimilikinya.`,
    confirmLabel: 'Ya, Aktifkan',
    tone: 'primary',
  },
  delete: {
    title: 'Hapus akun ini?',
    description: (user) =>
      `Akun "${user.name}" akan dihapus dan tidak dapat masuk lagi. Pengaduan serta jawaban survei yang pernah dikirimnya tetap tersimpan sebagai data.`,
    confirmLabel: 'Ya, Hapus Akun',
    tone: 'danger',
  },
};

export default function ManajemenUsersPage() {
  const router = useRouter();
  const [activeRoleFilter, setActiveRoleFilter] = useState('ALL');
  // Belum ada input pencarian lokal di halaman ini (lihat catatan di JSX bawah)
  // -- state disiapkan utk saat Navbar bisa menyalurkan query pencarian.
  const [searchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionError, setActionError] = useState(null);
  // `confirmAction` = { type: 'deactivate'|'activate'|'delete', user } saat
  // dialog terbuka. `busyUserId` mengunci dialognya selagi permintaan berjalan
  // supaya klik ganda tak mengirim dua permintaan.
  const [confirmAction, setConfirmAction] = useState(null);
  const [busyUserId, setBusyUserId] = useState(null);

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

  /** Jalankan aksi yang sudah dikonfirmasi lewat ConfirmDialog. */
  const handleConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, user } = confirmAction;
    setConfirmAction(null);
    setBusyUserId(user.id);
    setActionError(null);
    try {
      if (type === 'delete') {
        await deleteUser(user.id);
      } else {
        await updateUserStatus(user.id, type === 'activate');
      }
      await refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyUserId(null);
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
          onRequestAction={(user, type) => setConfirmAction({ type, user })}
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

      <ConfirmDialog
        isOpen={!!confirmAction}
        title={confirmAction ? CONFIRM_COPY[confirmAction.type].title : ''}
        description={
          confirmAction ? CONFIRM_COPY[confirmAction.type].description(confirmAction.user) : ''
        }
        confirmLabel={confirmAction ? CONFIRM_COPY[confirmAction.type].confirmLabel : ''}
        tone={confirmAction ? CONFIRM_COPY[confirmAction.type].tone : 'danger'}
        isProcessing={busyUserId !== null}
        onConfirm={handleConfirmedAction}
        onCancel={() => setConfirmAction(null)}
      />
    </div>
  );
}
