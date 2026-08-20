'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, ChevronDown, ShieldCheck, MessageSquare, ClipboardList, Repeat } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useAsync } from '@/hooks/useAsync';
import { USER_ROLES } from '@/features/users/constants/userConstants';
import { getMyProfile } from '../services/profile.api';
import { authApi } from '@/features/authentication/services/sso.api';
import { clearSession } from '@/features/authentication/services/authStorage';

/**
 * Menu akun di navbar warga (Navbar.jsx & DashboardNavbar.jsx).
 *
 * Profil diambil SENDIRI di sini lewat GET /auth/me. Sebelumnya komponen ini
 * bergantung pada prop `user` yang default-nya `DUMMY_CURRENT_USER` -- dan KEDUA
 * pemanggilnya tak pernah mengirim prop itu. Akibatnya setiap warga yang login
 * melihat identitas orang yang tak ada: "Ahmad Fauzi", "ahmad.fauzi@gmail.com",
 * "Responden / Masyarakat", di setiap halaman. Bukan sekadar default yang tak
 * terpakai -- itu satu-satunya nilai yang pernah dirender.
 *
 * Aman memanggil /auth/me di sini: kedua pemanggil hanya merender komponen ini
 * setelah sesi dipastikan ada (Navbar menjaganya dengan isAuthenticated(),
 * halaman dashboard sendiri sudah di balik proxy.js).
 */
export default function ProfileAvatarDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const router = useRouter();

  const fetchProfile = useCallback(() => getMyProfile(), []);
  const { data: user, isLoading } = useAsync(fetchProfile);

  // Menutup dropdown jika user mengklik area di luar dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    setIsOpen(false);
    try {
      await authApi.logout();
    } catch {
      // Logout stateless di backend — tetap hapus sesi lokal walau request gagal.
    }
    clearSession();
    router.push('/');
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center min-w-[44px] min-h-[44px] gap-2 p-1 rounded-full hover:bg-surface-container-low transition-all focus:outline-none focus:ring-2 focus:ring-primary"
        aria-expanded={isOpen}
        aria-haspopup="true"
        title="Menu Akun Saya"
      >
        {isLoading ? (
          <span className="w-8 h-8 rounded-full bg-surface-container animate-pulse" />
        ) : (
          <Avatar
            initials={user?.initials ?? '?'}
            src={user?.avatarUrl}
            size="md"
            className="shadow-2xs border border-border cursor-pointer"
          />
        )}
        <ChevronDown 
          size={14} 
          className={`text-text-secondary transition-transform duration-200 hidden sm:block ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 origin-top-right rounded-2xl bg-surface p-2 shadow-xl shadow-slate-900/10 border border-border/80 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-200">
          {/* User Header Info inside Dropdown */}
          <div className="px-3.5 py-3 border-b border-border/60 mb-1">
            <div className="flex items-center gap-1.5 font-bold text-sm text-text-primary truncate">
              <span>{user?.name ?? 'Memuat...'}</span>
              {/* Lencana ini menandakan sesi aktif, bukan verifikasi SSO
                  sungguhan -- SSO Helpdesk belum dibangun (lihat catatan gap
                  me.adapter.js), jadi tooltipnya tak lagi mengklaim itu. */}
              <ShieldCheck size={14} className="text-emerald-500 shrink-0 inline" title="Sesi aktif" />
            </div>
            <p className="text-xs text-text-secondary truncate font-mono mt-0.5">
              {user?.email ?? '-'}
            </p>
            {user?.roleLabel && (
              <div className="mt-1.5 inline-block bg-primary/10 text-primary px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider">
                {user.roleLabel}
              </div>
            )}
          </div>

          {/* Navigation Items */}
          <div className="space-y-0.5 py-1">

            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3.5 py-3 text-sm font-medium text-text-primary rounded-xl hover:bg-primary-container/30 hover:text-primary transition-colors min-h-[44px]"
            >
              <LayoutDashboard size={16} className="text-text-secondary group-hover:text-primary shrink-0" />
              <span>Dashboard Saya</span>
            </Link>

            <Link
              href="/complaints"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3.5 py-3 text-sm font-medium text-text-primary rounded-xl hover:bg-primary-container/30 hover:text-primary transition-colors min-h-[44px]"
            >
              <MessageSquare size={16} className="text-text-secondary group-hover:text-primary shrink-0" />
              <span>Pengaduan Saya</span>
            </Link>

            <Link
              href="/surveys"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3.5 py-3 text-sm font-medium text-text-primary rounded-xl hover:bg-primary-container/30 hover:text-primary transition-colors min-h-[44px]"
            >
              <ClipboardList size={16} className="text-text-secondary group-hover:text-primary shrink-0" />
              <span>Survei</span>
            </Link>
          </div>

          <div className="border-t border-border/60 my-1 pt-1">
            {/* Superuser yang sedang memakai area warga terkurung di area itu
                (lihat proxy.js) -- ini pintu berpindahnya tanpa logout. Peran
                lain tak punya apa pun untuk dipilih, jadi menunya disembunyikan. */}
            {user?.role === USER_ROLES.SUPERUSER && (
              <Link
                href="/pilih-peran"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 px-3.5 py-3 text-sm font-medium text-text-primary rounded-xl hover:bg-primary-container/30 hover:text-primary transition-colors min-h-[44px]"
              >
                <Repeat size={16} className="text-text-secondary shrink-0" />
                <span>Ganti Peran</span>
              </Link>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3.5 py-3 text-sm font-semibold text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors text-left min-h-[44px]"
            >
              <LogOut size={16} className="text-red-500 shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
