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
  History
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

  const getLinkClass = (path) => {
    // Exact match or active section
    const isActive = pathname === path || pathname.startsWith(`${path}/`);
    
    return isActive
      ? "flex items-center gap-md px-md py-sm bg-blue-600 text-white rounded-lg font-bold transition-all duration-150"
      : "flex items-center gap-md px-md py-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors rounded-lg";
  };

  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useAdminKabLayout();

  // Sama seperti AdminSidebar: latar laci menutupi layar, tapi halaman di
  // belakangnya tetap bergulir kalau tidak dikunci.
  useBodyScrollLock(isMobileSidebarOpen);

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}
      
      <aside className={`
        bg-slate-900 text-slate-300 font-body-md text-body-md h-screen w-64 fixed left-0 top-0 shadow-xl flex flex-col py-md px-sm z-50
        overflow-y-auto overscroll-contain
        transition-transform duration-300 ease-in-out
        ${isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="mb-xl px-md flex items-center justify-between">
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-blue-400">Admin Kabupaten</h1>
            <p className="text-sm opacity-60">Portal Eksekutif</p>
          </div>
          <button 
            className="md:hidden text-slate-400 hover:text-white"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X size={24} />
          </button>
        </div>
        
        <nav className="flex-1 space-y-sm">
          <Link href="/admin-kab/dashboard" className={getLinkClass('/admin-kab/dashboard')} onClick={() => setIsMobileSidebarOpen(false)}>
            <LayoutDashboard size={20} />
            <span>Dashboard</span>
          </Link>
          <Link href="/admin-kab/opd" className={getLinkClass('/admin-kab/opd')} onClick={() => setIsMobileSidebarOpen(false)}>
            <Building2 size={20} />
            <span>Manajemen OPD</span>
          </Link>
          <Link href="/admin-kab/surveys" className={getLinkClass('/admin-kab/surveys')} onClick={() => setIsMobileSidebarOpen(false)}>
            <ClipboardList size={20} />
            <span>Monitoring Survei</span>
          </Link>
          <Link href="/admin-kab/complaints" className={getLinkClass('/admin-kab/complaints')} onClick={() => setIsMobileSidebarOpen(false)}>
            <MessageSquare size={20} />
            <span>Pengaduan</span>
          </Link>
          {/* Manajemen User & Audit Logs: milik Admin Kabupaten sejak peleburan
              peran superuser (15 September 2026). Sidebar ini memang hanya
              tampil di area Admin Kabupaten, jadi tak ada penjaga tambahan. */}
          <Link href="/admin-kab/users" className={getLinkClass('/admin-kab/users')} onClick={() => setIsMobileSidebarOpen(false)}>
            <Users size={20} />
            <span>Manajemen User</span>
          </Link>
          <Link href="/admin-kab/audit-logs" className={getLinkClass('/admin-kab/audit-logs')} onClick={() => setIsMobileSidebarOpen(false)}>
            <History size={20} />
            <span>Audit Logs</span>
          </Link>
        </nav>

        {/* "Keluar" kembali ke sini atas permintaan pengguna (1 September 2026).
            Yang membuatnya aman sekarang: `<aside>` di atas sudah
            `overflow-y-auto overscroll-contain`, jadi menu manajemen yang
            lebih tinggi dari layar bisa digulir dan tombol ini tetap dapat
            dicapai -- persis kelas masalah yang dulu membuatnya dipindahkan.
            Alasan panjangnya di AdminSidebarLogout.
            "Ganti Peran" TETAP hanya di ikon profil (AdminAccountMenu). */}
        <AdminSidebarLogout />
      </aside>
    </>
  );
}
