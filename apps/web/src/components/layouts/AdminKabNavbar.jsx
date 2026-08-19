'use client';
import React, { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, CalendarRange, Layers } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Dropdown from '@/components/ui/Dropdown';
import NotificationDropdown from '@/components/ui/NotificationDropdown';
import { useAdminKabLayout } from './AdminKabLayoutProvider';
import { useAsync } from '@/hooks/useAsync';
import { getMyProfile } from '@/features/profile/services/profile.api';
import { getOpdList } from '@/features/opd/services/opd.api';
import { buildRecentPeriodeOptions } from '@/features/surveys/adapters/survey.adapter';

// "Semua Periode" sengaja jadi opsi pertama DAN nilai awal -- lihat alasannya di
// AdminKabLayoutProvider.jsx (dashboard eksekutif tak boleh tampil kosong hanya
// karena triwulan berjalan belum punya survei bernilai).
const ALL_PERIODS = { value: '', label: 'Semua Periode' };
const PERIODE_OPTIONS = [ALL_PERIODS, ...buildRecentPeriodeOptions()];

// Dipetakan dari rute yang BENAR-BENAR ada (lihat app/admin-kab/* dan tautan di
// AdminKabSidebar.jsx). Judul lama mencocokkan '/management-opd' dan
// '/management-users' -- dua rute yang tak pernah ada di proyek ini, sehingga
// LIMA dari enam halaman jatuh ke judul umum "Panel Admin Kabupaten".
// Diurut dari yang paling spesifik supaya pencocokan awalan tak salah ambil.
const PAGE_TITLES = [
  ['/admin-kab/dashboard', 'Dashboard Eksekutif'],
  ['/admin-kab/opd', 'Manajemen OPD'],
  ['/admin-kab/surveys', 'Monitoring Survei'],
  ['/admin-kab/complaints', 'Pengaduan'],
  ['/admin-kab/users', 'Manajemen User'],
  ['/admin-kab/audit-logs', 'Audit Logs'],
];

const ALL_SERVICES = { value: '', label: 'Semua Layanan' };

/**
 * Navbar Admin Kabupaten.
 *
 * SEBELUMNYA identitasnya karangan: nama "Admin Kabupaten" dan inisial "AK"
 * di-hardcode, bukan pengguna yang sedang login. Kini dari GET /auth/me
 * (inisial lewat Avatar.jsx -- backend tak punya foto profil maupun jabatan,
 * lihat catatan gap me.adapter.js).
 *
 * Kedua penyaring juga mati total: keduanya menulis `?year=` / `?service=` ke
 * URL, TAPI tak satu pun komponen membacanya (halaman dashboard sendiri sudah
 * membuang dukungan filter itu, lihat komentar di app/admin-kab/dashboard/page.jsx).
 * Nilainya pun tak mungkin cocok data nyata: tahunnya cuma 2024 & 2023
 * (keduanya sudah lampau), dan jenis layanannya huruf kecil ('kesehatan')
 * sementara backend menyimpannya kapital ('Kesehatan') dan mencocokkan persis.
 *
 * Sekarang keduanya nyata dan diteruskan ke `GET /dashboard/ikm`, yang memang
 * menerima `periode` + `jenisLayanan` (DashboardIkmQueryDto):
 * - periode memakai format kanonik {tahun}-Q{1-4}, bukan tahun saja -- backend
 *   mencocokkan `IkmResult.periode`/`Survey.periode` PERSIS, jadi "2026" tak
 *   akan cocok apa pun.
 * - pilihan jenis layanan dibangun dari nilai `jenisLayanan` yang SUNGGUHAN ada
 *   di data OPD, bukan daftar tetap. Dropdown-nya disembunyikan bila tak ada
 *   satu pun OPD yang punya nilai itu (kondisi data saat ini: hanya 1 dari 54
 *   OPD terisi, sisanya null karena OPD cuma cache read-only dari Helpdesk).
 */
export default function AdminKabNavbar() {
  const {
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    periode,
    setPeriode,
    jenisLayanan,
    setJenisLayanan,
  } = useAdminKabLayout();
  const pathname = usePathname();

  const pageTitle =
    PAGE_TITLES.find(([prefix]) => pathname?.startsWith(prefix))?.[1] ?? 'Panel Admin Kabupaten';

  // Penyaring HANYA di dashboard -- satu-satunya halaman yang membacanya.
  const isDashboard = pathname?.startsWith('/admin-kab/dashboard');

  const fetchProfile = useCallback(() => getMyProfile(), []);
  const { data: user, isLoading } = useAsync(fetchProfile);

  const fetchServiceOptions = useCallback(async () => {
    if (!isDashboard) return [];
    const { data: opdList } = await getOpdList({ limit: 100 });
    const jenis = [...new Set(opdList.map((opd) => opd.serviceType).filter(Boolean))].sort();
    return jenis.map((value) => ({ value, label: value }));
  }, [isDashboard]);
  const { data: serviceOptions } = useAsync(fetchServiceOptions);

  const hasServiceFilter = (serviceOptions?.length ?? 0) > 0;

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 min-h-[80px] bg-surface border-b border-outline-variant flex flex-col md:flex-row justify-center md:justify-between px-4 py-3 md:px-lg md:py-0 z-30 gap-3 md:gap-0 transition-all">
      <div className="flex items-center justify-between md:justify-start gap-4 w-full md:w-auto">
        <div className="flex items-center gap-2 min-w-0">
          <button
            className="md:hidden p-2 text-on-surface hover:bg-surface-container rounded-lg shrink-0"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
          >
            <Menu size={24} />
          </button>
          <h2 className="font-headline-md text-base md:text-headline-md font-extrabold text-primary truncate max-w-[200px] md:max-w-none">
            {pageTitle}
          </h2>
        </div>

        {/* Avatar mobile */}
        {isLoading ? (
          <div className="md:hidden w-8 h-8 rounded-full bg-surface-container animate-pulse shrink-0" />
        ) : (
          <Avatar
            initials={user?.initials ?? '?'}
            size="md"
            variant="outline"
            className="md:hidden bg-primary-container text-on-primary-container border-2 border-primary/20"
          />
        )}
      </div>

      <div className="flex items-center flex-wrap gap-2 md:gap-md w-full md:w-auto justify-between md:justify-end">
        {isDashboard && (
          <div className="flex items-center gap-2 w-full md:w-auto pb-1 md:pb-0">
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <CalendarRange size={18} className="hidden lg:block text-secondary shrink-0" />
              <Dropdown
                id="filter-kab-periode"
                options={PERIODE_OPTIONS}
                value={periode}
                onChange={setPeriode}
                variant="primary"
                className="w-full"
              />
            </div>
            {hasServiceFilter && (
              <div className="flex-1 min-w-0 flex items-center gap-1.5">
                <Layers size={18} className="hidden lg:block text-secondary shrink-0" />
                <Dropdown
                  id="filter-kab-layanan"
                  options={[ALL_SERVICES, ...serviceOptions]}
                  value={jenisLayanan}
                  onChange={setJenisLayanan}
                  variant="primary"
                  className="w-full"
                />
              </div>
            )}
          </div>
        )}

        {/* Notifikasi (2026-08-05) -- SEBELUMNYA tak terpasang sama sekali di
            navbar ini (temuan audit), padahal AdminNavbar (Admin OPD) sudah
            punya lebih dulu. */}
        <NotificationDropdown />

        {/* Profil desktop */}
        <div className="hidden md:flex items-center gap-md pl-lg border-l border-border">
          {isLoading ? (
            <>
              <div className="text-right space-y-1">
                <div className="h-4 w-28 rounded bg-surface-container animate-pulse" />
                <div className="h-3 w-20 rounded bg-surface-container animate-pulse ml-auto" />
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container animate-pulse" />
            </>
          ) : (
            <>
              <div className="text-right">
                <p className="text-label-md font-bold text-primary truncate max-w-[180px]">
                  {user?.name ?? 'Pengguna'}
                </p>
                <p className="text-xs text-secondary">{user?.roleLabel ?? '-'}</p>
              </div>
              <Avatar
                initials={user?.initials ?? '?'}
                size="lg"
                variant="outline"
                className="w-10 h-10 text-xs bg-primary-container text-on-primary-container border-2 border-primary/20"
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
