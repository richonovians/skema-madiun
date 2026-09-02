'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogOut, ChevronDown, ShieldCheck, MessageSquare, ClipboardList, Repeat, AlertTriangle, RefreshCw } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import ProfileErrorAvatar from '@/components/ui/ProfileErrorAvatar';
import { useAsync } from '@/hooks/useAsync';
import useKeepInViewport from '@/hooks/useKeepInViewport';
import { isUnauthorizedError } from '@/services/api';
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

  // Panel 256px ini terukur `kiri=-4` pada layar 320px -- baru 4px, tapi
  // penyebabnya sama dengan panel notifikasi yang kehilangan 60px, dan ia akan
  // memburuk begitu ada satu ikon lagi ditambahkan di kanannya. Lihat
  // useKeepInViewport.
  const panelRef = useRef(null);
  useKeepInViewport(panelRef, isOpen);
  const router = useRouter();

  const fetchProfile = useCallback(() => getMyProfile(), []);
  const { data: user, isLoading, error, refetch } = useAsync(fetchProfile);

  // `error` dari useAsync SEBELUMNYA tak pernah diambil sama sekali (2026-08-28).
  // Komponen ini cuma mengenal dua keadaan -- memuat & selesai -- sehingga saat
  // GET /auth/me gagal, `isLoading` menjadi false dengan `data` tetap null dan
  // yang dirender adalah nilai kalau-kalau `initials={user?.initials ?? '?'}`.
  // Hasilnya "?" yang menetap di ikon akun, dan pengguna hanya bisa
  // membersihkannya dengan menekan Logout sendiri.
  //
  // Kedua kegagalan ini menuntut perlakuan yang BERBEDA, bukan pesan yang berbeda:
  const sesiHabis = error != null && isUnauthorizedError(error);
  const gagalKoneksi = error != null && !sesiHabis;

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

  // Sesi ditolak backend: tak ada lagi akun untuk ditampilkan menunya. Artefak
  // sesinya sudah dibuang interceptor api.js, dan clearSession() menembakkan
  // SESSION_CHANGED_EVENT sehingga Navbar menggantinya dengan tombol masuk pada
  // render yang sama -- tanpa perlu muat ulang, apalagi logout manual.
  //
  // Ditempatkan SETELAH semua hook supaya urutan hook tetap sama di tiap render.
  if (sesiHabis) return null;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Avatar Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center min-w-[44px] min-h-[44px] gap-2 p-1 rounded-full hover:bg-surface-container-low transition-all focus:outline-none focus:ring-2 focus:ring-primary"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={
          gagalKoneksi ? 'Profil gagal dimuat, server tidak dapat dihubungi' : 'Menu Akun Saya'
        }
        title={
          gagalKoneksi ? 'Profil gagal dimuat, server tidak dapat dihubungi' : 'Menu Akun Saya'
        }
      >
        {isLoading ? (
          <span className="w-8 h-8 rounded-full bg-surface-container animate-pulse" />
        ) : gagalKoneksi ? (
          <ProfileErrorAvatar reason="offline" size="md" className="border-error/40" />
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
        <div
          ref={panelRef}
          className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-1.5rem)] origin-top-right rounded-2xl bg-surface p-2 shadow-xl shadow-slate-900/10 border border-border/80 focus:outline-none z-50 animate-in fade-in zoom-in-95 duration-200"
        >
          {/* User Header Info inside Dropdown */}
          {gagalKoneksi ? (
            /* Keterangan + pemulihan diletakkan DI TEMPAT identitas, bukan di
               tepi halaman: yang gagal adalah identitas ini, jadi di sinilah
               pengguna mencarinya. Nyatakan juga bahwa sesinya masih tersimpan
               -- itu yang membedakan keadaan ini dari "sesi habis", dan tanpa
               dikatakan, kegagalan memuat mudah disalahartikan sebagai akun
               yang rusak. */
            <div className="px-3.5 py-3 border-b border-border/60 mb-1">
              <div className="flex items-center gap-1.5 font-bold text-sm text-error">
                <AlertTriangle size={14} className="shrink-0" aria-hidden="true" />
                <span>Profil gagal dimuat</span>
              </div>
              <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                Server tidak dapat dihubungi. Sesi Anda masih tersimpan, coba lagi setelah koneksi
                pulih.
              </p>
              <button
                type="button"
                onClick={refetch}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 text-xs font-semibold text-primary bg-primary/10 rounded-xl hover:bg-primary/15 transition-colors min-h-[44px]"
              >
                <RefreshCw size={14} className="shrink-0" aria-hidden="true" />
                <span>Coba Lagi</span>
              </button>
            </div>
          ) : (
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
          )}

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
