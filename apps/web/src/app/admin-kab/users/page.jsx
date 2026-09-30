'use client';

import React, { useCallback, useMemo, useState } from 'react';
import UsersRoleFilter from '@/features/users/components/UsersRoleFilter';
import UsersTable from '@/features/users/components/UsersTable';
import { Search, X } from 'lucide-react';
import Pagination from '@/components/ui/Pagination';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import ActiveAccountsInfo from '@/components/ui/ActiveAccountsInfo';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { USER_ROLES } from '@/features/users/constants/userConstants';
import {
  getUsers,
  getUserStats,
  updateUser,
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
  /**
   * Pintasan menaikkan ASN menjadi Admin OPD (30 September 2026).
   *
   * INSTANSINYA DISEBUT, bukan cuma nama orangnya: yang diserahkan di sini
   * adalah kuasa atas data satu instansi, dan yang menekan harus melihat
   * instansi mana itu sebelum menekan -- bukan sesudahnya.
   */
  'promote-opd': {
    title: 'Jadikan Admin OPD?',
    description: (user) =>
      `"${user.name}" akan dapat mengelola survei, pertanyaan, respons, dan pengaduan milik ` +
      `${user.organization ?? 'instansi yang tertaut di akunnya'}. Perannya sebagai warga tetap dipertahankan.`,
    confirmLabel: 'Ya, Jadikan Admin OPD',
    tone: 'primary',
  },
};

/**
 * Peran sesudah dinaikkan menjadi Admin OPD.
 *
 * `responden` IKUT ditambahkan bila belum ada, sama seperti halaman Ubah Role
 * (21 September 2026): mencentang salah satu peran administrator di sana
 * otomatis mencentang Responden juga. Dua jalan menuju hasil yang sama harus
 * menghasilkan hal yang sama -- kalau tidak, pintasan ini justru mengubah akun
 * secara berbeda dari cara panjangnya, dan bedanya tak akan terlihat siapa pun.
 *
 * `opdId` TIDAK disertakan: ia milik Helpdesk, dan `UpdateUserDto` menolaknya
 * 400. Penyaringnya ada di `toUpdateUserPayload`, jadi di sini cukup tak
 * mengirimkannya.
 */
function rolesSetelahNaik(user) {
  return Array.from(
    new Set([...(user.roles ?? []), USER_ROLES.ADMIN_OPD, USER_ROLES.RESPONDENT]),
  );
}

export default function ManajemenUsersPage() {
  const [activeRoleFilter, setActiveRoleFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [actionError, setActionError] = useState(null);
  // `confirmAction` = { type: 'deactivate'|'activate'|'delete'|'promote-opd', user }
  // saat dialog terbuka. `busyUserId` mengunci dialognya selagi permintaan
  // berjalan supaya klik ganda tak mengirim dua permintaan.
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

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
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
      } else if (type === 'promote-opd') {
        await updateUser(user.id, { roles: rolesSetelahNaik(user) });
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
      {/* Search bar -- mencari berdasarkan nama atau email pengguna */}
      <div className="mb-lg">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none"
          />
          <input
            id="user-search-input"
            type="text"
            placeholder="Cari berdasarkan nama atau email..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full min-h-[44px] pl-10 pr-10 py-md border border-outline-variant rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => { setSearchQuery(''); setCurrentPage(1); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-text-primary transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Filter role.
          TANPA tombol "Reset Filter" -- diminta pengguna, 2 September 2026.
          Penyaring di halaman ini berupa tab peran yang salah satunya selalu
          aktif dan "Semua Pengguna" ada di paling kiri, jadi menetralkannya
          sudah satu ketukan; tombol reset hanya menduplikasi tab itu.

          TANPA tombol "Buat Akun Admin Baru" -- diminta pengguna, 30 September
          2026. Halaman /admin-kab/users/create IKUT DIBUANG pada tanggal yang
          sama, jadi tak ada lagi jalan membuat akun admin dari antarmuka:
          akun lahir dari SSO Helpdesk, lalu perannya diatur di halaman ini. */}
      <div className="mb-lg">
        <UsersRoleFilter
          activeRoleFilter={activeRoleFilter}
          setActiveRoleFilter={handleRoleFilterChange}
        />
      </div>

      {/* BARIS SENDIRI, bukan anak baris tab di atas. Ketika tombol "Buat Akun
          Admin Baru" masih ada, ketiganya bersama melebihi lebar layar 1440px
          sekalipun dan salah satu PASTI mengalah: stripnya digencet sampai
          kalimatnya terbelah dua baris, lalu begitu ia dibuat tak menyusut,
          tombolnya yang terlempar ke baris kedua. Tombol itu kini tiada, tapi
          barisnya tetap dipisah -- letak inilah yang sama dengan pada kedua
          dashboard, dan menyatukannya kembali hanya membuat halaman ini
          berbeda dari keduanya. */}
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
