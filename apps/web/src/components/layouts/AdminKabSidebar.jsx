'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Building2,
  Users,
  MessageSquare,
  ClipboardList,
  X,
  History,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import AdminSidebarLogout from './AdminSidebarLogout';
import { useAdminKabLayout } from './AdminKabLayoutProvider';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/**
 * "Audit Logs" DAN "Manajemen User" hanya untuk SUPERUSER (2026-08-20, atas
 * permintaan user): Admin Kabupaten biasa tak boleh melihat log aktivitas maupun
 * mengelola akun. Konsekuensinya sengaja: pengangkatan/penurunan peran admin kini
 * sepenuhnya di tangan superuser.
 *
 * Perannya dibaca dari `GET /auth/me`, BUKAN dari cookie `role` -- cookie itu
 * bisa disunting bebas di peramban, jadi tak layak jadi dasar keputusan tampilan
 * yang seolah-olah hak akses. Batas sesungguhnya tetap di backend
 * (AuditService.assertSuperuser & UsersService.assertSuperuser, 403 walau URL
 * dipaksa); menyembunyikan menu di sini supaya pengguna tak diarahkan ke halaman
 * yang pasti gagal.
 *
 * "Ganti Peran" juga khusus superuser: pilihan perannya saat login mengurung
 * navigasinya ke satu area (lihat proxy.js), dan ini jalan berpindahnya tanpa
 * harus keluar-masuk lagi.
 */
export default function AdminKabSidebar() {
  const pathname = usePathname();

  const { isMobileSidebarOpen, setIsMobileSidebarOpen, isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed } = useAdminKabLayout();

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

  // Sama seperti AdminSidebar: latar laci menutupi layar, tapi halaman di
  // belakangnya tetap bergulir kalau tidak dikunci.
  useBodyScrollLock(isMobileSidebarOpen);

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
      
      <aside className={`
        bg-white border-r border-slate-200 text-slate-700 font-body-md text-body-md h-screen ${isDesktopSidebarCollapsed ? 'w-20' : 'w-64'} fixed left-0 top-0 shadow-xl flex flex-col py-md px-sm z-50
        overflow-y-auto overscroll-contain
        transition-all duration-300 ease-in-out
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className={`mb-4 flex items-center ${isDesktopSidebarCollapsed ? 'justify-center px-0 mt-2' : 'justify-between px-md'}`}>
          {!isDesktopSidebarCollapsed && (
            <div className="min-w-0">
              <h1 className="font-headline-md text-headline-md font-bold text-blue-600">Admin Kabupaten</h1>
              <p className="text-sm text-slate-500">Portal Eksekutif</p>
            </div>
          )}

          <button 
            className="md:hidden p-2 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-blue-50 shrink-0"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>

        {/* Garis pembatas tipis */}
        <div className="mx-2 mb-6 border-t border-slate-200"></div>
        
        <nav className="flex-1 space-y-sm">
          <Link href="/admin-kab/dashboard" title="Dashboard" className={getLinkClass('/admin-kab/dashboard')} onClick={() => setIsMobileSidebarOpen(false)}>
            <LayoutDashboard size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
            {!isDesktopSidebarCollapsed && <span>Dashboard</span>}
          </Link>
          <Link href="/admin-kab/opd" title="Daftar OPD" className={getLinkClass('/admin-kab/opd')} onClick={() => setIsMobileSidebarOpen(false)}>
            <Building2 size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
            {!isDesktopSidebarCollapsed && <span>Daftar OPD</span>}
          </Link>
          <Link href="/admin-kab/surveys" title="Monitoring Survei" className={getLinkClass('/admin-kab/surveys')} onClick={() => setIsMobileSidebarOpen(false)}>
            <ClipboardList size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
            {!isDesktopSidebarCollapsed && <span>Monitoring Survei</span>}
          </Link>
          <Link href="/admin-kab/complaints" title="Pengaduan" className={getLinkClass('/admin-kab/complaints')} onClick={() => setIsMobileSidebarOpen(false)}>
            <MessageSquare size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
            {!isDesktopSidebarCollapsed && <span>Pengaduan</span>}
          </Link>
          {/* Manajemen User & Audit Logs: milik Admin Kabupaten sejak peleburan
              peran superuser (15 September 2026). Sidebar ini memang hanya
              tampil di area Admin Kabupaten, jadi tak ada penjaga tambahan. */}
          <Link href="/admin-kab/users" title="Manajemen User" className={getLinkClass('/admin-kab/users')} onClick={() => setIsMobileSidebarOpen(false)}>
            <Users size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
            {!isDesktopSidebarCollapsed && <span>Manajemen User</span>}
          </Link>
          <Link href="/admin-kab/audit-logs" title="Audit Logs" className={getLinkClass('/admin-kab/audit-logs')} onClick={() => setIsMobileSidebarOpen(false)}>
            <History size={20} className="shrink-0 transition-transform duration-300 group-hover:scale-110" />
            {!isDesktopSidebarCollapsed && <span>Audit Logs</span>}
          </Link>
        </nav>

        {/* "Keluar" kembali ke sini atas permintaan pengguna (1 September 2026).
            Yang membuatnya aman sekarang: `<aside>` di atas sudah
            `overflow-y-auto overscroll-contain`, jadi menu manajemen yang
            lebih tinggi dari layar bisa digulir dan tombol ini tetap dapat
            dicapai -- persis kelas masalah yang dulu membuatnya dipindahkan.
            Alasan panjangnya di AdminSidebarLogout.
            "Ganti Peran" TETAP hanya di ikon profil (AdminAccountMenu). */}
        <AdminSidebarLogout isCollapsed={isDesktopSidebarCollapsed} />
      </aside>
    </>
  );
}
