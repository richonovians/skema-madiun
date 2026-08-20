'use client';

import React, { useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, CalendarRange } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import Dropdown from '@/components/ui/Dropdown';
import NotificationDropdown from '@/components/ui/NotificationDropdown';
import { useAdminLayout } from './AdminLayoutProvider';
import { useAsync } from '@/hooks/useAsync';
import { getMyProfile } from '@/features/profile/services/profile.api';
import { getOpdById } from '@/features/opd/services/opd.api';
import { buildRecentPeriodeOptions } from '@/features/surveys/adapters/survey.adapter';

const PERIODE_OPTIONS = buildRecentPeriodeOptions();

/**
 * Navbar Admin OPD.
 *
 * SEBELUMNYA seluruh identitas di sini karangan: nama OPD di-hardcode "Dinas
 * Kesehatan", pengguna "Dr. Handoko / Kepala Dinas", dan fotonya diambil dari
 * URL googleusercontent milik mockup desain. Siapa pun yang login melihat
 * identitas orang yang tidak ada -- termasuk nama OPD yang bukan OPD-nya.
 * Kini semuanya dari GET /auth/me + GET /opd/:id.
 *
 * Catatan jabatan: backend TAK PUNYA field jabatan sama sekali (skema User cuma
 * nama/email/role/opdId), jadi baris kedua memakai label PERAN ("Admin OPD")
 * -- bukan "Kepala Dinas" yang tak pernah ada sumbernya.
 *
 * Foto profil: `avatarUrl` juga tak ada di backend (lihat catatan gap
 * me.adapter.js), jadi dipakai inisial lewat Avatar.jsx. Ini sekaligus
 * menghapus satu permintaan gambar ke host eksternal dari tiap halaman admin.
 */
export default function AdminNavbar() {
  const { isMobileSidebarOpen, setIsMobileSidebarOpen, periode, setPeriode } = useAdminLayout();
  const pathname = usePathname();

  // Penyaring triwulan HANYA ditampilkan di dashboard -- itu satu-satunya
  // halaman yang membacanya (lihat AdminLayoutProvider). Menampilkannya di
  // halaman lain justru mengulang masalah lama: kontrol yang tak berefek apa pun.
  const showPeriodeFilter = pathname?.startsWith('/admin-opd/dashboard');

  const fetchIdentity = useCallback(async () => {
    const user = await getMyProfile();
    // Admin Kabupaten boleh membuka halaman /admin-opd/* (lihat proxy.js) dan
    // TIDAK tertaut ke OPD mana pun -- jangan paksa panggil /opd/null.
    const opd = user.opdId != null ? await getOpdById(user.opdId) : null;
    return { user, opd };
  }, []);

  const { data: identity, isLoading } = useAsync(fetchIdentity);
  const user = identity?.user;
  const opd = identity?.opd;

  const titleText = opd?.name ?? (user?.role === 'ADMIN_KABUPATEN' ? 'Lintas OPD' : 'Panel Admin OPD');

  return (
    <header className="fixed top-0 right-0 left-0 md:left-64 h-16 md:h-20 bg-surface border-b border-outline-variant flex justify-between items-center px-4 md:px-lg z-40 transition-all gap-2">
      <div className="flex items-center gap-2 md:gap-lg flex-1 min-w-0">
        <button
          className="md:hidden p-2 text-on-surface hover:bg-surface-container rounded-lg shrink-0"
          onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        >
          <Menu size={24} />
        </button>

        {isLoading ? (
          <span className="h-5 w-40 rounded bg-surface-container animate-pulse" />
        ) : (
          <span
            className="font-headline-md text-base md:text-headline-md font-extrabold text-primary truncate"
            title={opd?.name ? `${opd.name}${opd.code ? ` (${opd.code})` : ''}` : titleText}
          >
            {titleText}
          </span>
        )}

        {showPeriodeFilter && (
          <>
            <div className="hidden md:block h-8 w-[1px] bg-outline-variant shrink-0"></div>
            <div className="flex items-center gap-2 shrink-0">
              <CalendarRange size={18} className="hidden md:block text-secondary shrink-0" />
              <Dropdown
                id="filter-periode"
                options={PERIODE_OPTIONS}
                value={periode}
                onChange={setPeriode}
                variant="primary"
              />
            </div>
          </>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-lg shrink-0 ml-auto">
        <div className="flex gap-1 md:gap-md">
          <NotificationDropdown />
        </div>

        <div className="flex items-center gap-2 md:gap-md md:border-l border-outline-variant md:pl-lg">
          {isLoading ? (
            <>
              <div className="text-right hidden sm:block space-y-1">
                <div className="h-4 w-28 rounded bg-surface-container animate-pulse" />
                <div className="h-3 w-16 rounded bg-surface-container animate-pulse ml-auto" />
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container animate-pulse" />
            </>
          ) : (
            <>
              <div className="text-right hidden sm:block">
                <p className="text-label-md font-bold text-primary truncate max-w-[180px]">
                  {user?.name ?? 'Pengguna'}
                </p>
                <p className="text-xs text-secondary">{user?.roleLabel ?? '-'}</p>
              </div>
              <Avatar
                initials={user?.initials ?? '?'}
                size="lg"
                className="w-10 h-10 text-xs border-2 border-primary/20"
              />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
