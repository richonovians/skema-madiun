'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Inbox,
  TrendingUp,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import AdminSidebarLogout from './AdminSidebarLogout';
import { useAdminLayout } from './AdminLayoutProvider';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/**
 * "Ganti Peran" hanya tampil untuk SUPERUSER yang sedang memakai area OPD
 * (2026-08-20). Tanpa pintu ini, superuser yang memilih area OPD terkurung di
 * sana sampai logout -- proxy.js memantulkan setiap halaman di luar areanya.
 *
 * Perannya dibaca dari `GET /auth/me`, bukan cookie `role` (yang bisa disunting
 * bebas di peramban), mengikuti pola AdminKabSidebar.
 */
export default function AdminSidebar() {
  const pathname = usePathname();
  const { isMobileSidebarOpen, setIsMobileSidebarOpen, isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed } = useAdminLayout();

  // Laci mobile: latarnya menutupi layar, tapi tanpa kunci halaman di belakangnya
  // tetap ikut bergulir saat jari diusap di atas latar itu. `isMobileSidebarOpen`
  // hanya pernah true di ponsel (di md+ laci ini selalu tampak, tak pernah dibuka).
  useBodyScrollLock(isMobileSidebarOpen);

  const getLinkClass = (path) => {
    const isActive = pathname === path || pathname.startsWith(`${path}/`);
    
    let base = "flex items-center gap-md py-sm rounded-lg transition-all duration-300 relative group hover:translate-x-1 hover:shadow-sm ";
    base += isDesktopSidebarCollapsed ? "justify-center px-0 " : "px-md ";
    
    if (isActive) {
      base += "bg-blue-600 text-white font-bold shadow-md ";
    } else {
      base += "text-slate-500 hover:text-blue-600 hover:bg-blue-50 ";
    }
    return base;
  };

  return (
    <>
      {/* Overlay untuk mobile */}
      {isMobileSidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Tombol Toggle Desktop diletakkan di LUAR aside agar tidak terpotong overflow */}
      <button 
        className={`hidden md:flex fixed top-8 h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-400 hover:text-blue-600 hover:bg-slate-50 shadow-sm z-[60] transition-all duration-300 hover:scale-110 ${
          isDesktopSidebarCollapsed ? 'left-[66px]' : 'left-[242px]'
        }`}
        onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
        title={isDesktopSidebarCollapsed ? "Perbesar Sidebar" : "Perkecil Sidebar"}
      >
        {isDesktopSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>

      <aside className={`bg-white border-r border-slate-200 text-slate-700 font-body-md text-body-md h-screen ${isDesktopSidebarCollapsed ? 'w-20' : 'w-64'} fixed left-0 top-0 shadow-xl flex flex-col py-md px-sm z-50 overflow-y-auto overscroll-contain transition-all duration-300 ease-in-out ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className={`mb-4 flex items-center ${isDesktopSidebarCollapsed ? 'justify-center px-0 mt-2' : 'justify-between px-md'}`}>
          {!isDesktopSidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="font-headline-md text-headline-md font-bold text-blue-600">Admin OPD</h1>
              <p className="text-sm text-slate-500">Portal Analitik</p>
            </div>
          )}

          <button 
            className="md:hidden p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 shrink-0"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        {/* Garis pembatas tipis */}
        <div className="mx-2 mb-6 border-t border-slate-200"></div>
      
      <nav className="flex-1 space-y-sm">
        <Link href="/admin-opd/dashboard" title="Dashboard" className={getLinkClass('/admin-opd/dashboard')} onClick={() => setIsMobileSidebarOpen(false)}>
          <LayoutDashboard size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
          {!isDesktopSidebarCollapsed && <span>Dashboard</span>}
        </Link>
        <Link href="/admin-opd/surveys" title="Survei" className={getLinkClass('/admin-opd/surveys')} onClick={() => setIsMobileSidebarOpen(false)}>
          <ClipboardList size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
          {!isDesktopSidebarCollapsed && <span>Survei</span>}
        </Link>
        <Link href="/admin-opd/complaints" title="Aduan" className={getLinkClass('/admin-opd/complaints')} onClick={() => setIsMobileSidebarOpen(false)}>
          <Inbox size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
          {!isDesktopSidebarCollapsed && <span>Aduan</span>}
        </Link>
        <Link href="/admin-opd/analytics" title="Statistik & Laporan" className={getLinkClass('/admin-opd/analytics')} onClick={() => setIsMobileSidebarOpen(false)}>
          <TrendingUp size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
          {!isDesktopSidebarCollapsed && <span>Statistik & Laporan</span>}
        </Link>
      </nav>
      
      {/* "Keluar" kembali ke sini atas permintaan pengguna (1 September 2026),
          kini aman karena `<aside>` di atas sudah `overflow-y-auto` -- lihat
          AdminSidebarLogout untuk sebab lengkapnya. "Ganti Peran" TETAP hanya
          di ikon profil: yang diminta kembali cuma tombol keluar, dan
          menggandakan pintu ganti peran ke dua tempat tak menambah apa pun. */}
      <AdminSidebarLogout isCollapsed={isDesktopSidebarCollapsed} />
    </aside>
    </>
  );
}
