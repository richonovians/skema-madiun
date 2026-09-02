'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  ClipboardList,
  Inbox,
  TrendingUp,
  X
} from 'lucide-react';
import AdminSidebarLogout from './AdminSidebarLogout';
import { useAdminLayout } from './AdminLayoutProvider';
import { useActingOpd } from '@/hooks/useActingOpd';
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
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useAdminLayout();
  const actingOpd = useActingOpd();

  // Laci mobile: latarnya menutupi layar, tapi tanpa kunci halaman di belakangnya
  // tetap ikut bergulir saat jari diusap di atas latar itu. `isMobileSidebarOpen`
  // hanya pernah true di ponsel (di md+ laci ini selalu tampak, tak pernah dibuka).
  useBodyScrollLock(isMobileSidebarOpen);

  const getLinkClass = (path) => {
    // Exact match or active section
    const isActive = pathname === path || pathname.startsWith(`${path}/`);
    
    return isActive
      ? "flex items-center gap-md px-md py-sm bg-blue-600 text-white rounded-lg font-bold transition-all duration-150"
      : "flex items-center gap-md px-md py-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors rounded-lg";
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

      <aside className={`bg-slate-900 text-slate-300 font-body-md text-body-md h-screen w-64 fixed left-0 top-0 shadow-xl flex flex-col py-md px-sm z-50 overflow-y-auto overscroll-contain transition-transform duration-300 ease-in-out ${
        isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        <div className="mb-xl px-md flex items-center justify-between">
          <div className="min-w-0">
            <h1 className="font-headline-md text-headline-md font-bold text-blue-400">Admin OPD</h1>
            {/* OPD yang diperankan superuser (2026-08-20). Ditampilkan supaya ia
                selalu tahu data OPD MANA yang sedang dilihatnya -- tanpa ini
                daftar survei/pengaduan yang tersaring bisa disalahpahami sebagai
                "OPD ini tidak punya data". Untuk Admin OPD sungguhan tak ada
                apa pun yang berubah (nilainya null). */}
            {actingOpd ? (
              <p className="text-sm opacity-70 truncate" title={actingOpd.nama}>
                {actingOpd.nama}
              </p>
            ) : (
              <p className="text-sm opacity-60">Portal Analitik</p>
            )}
          </div>
          <button 
            className="md:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
            onClick={() => setIsMobileSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>
      
      <nav className="flex-1 space-y-sm">
        <Link href="/admin-opd/dashboard" className={getLinkClass('/admin-opd/dashboard')} onClick={() => setIsMobileSidebarOpen(false)}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/admin-opd/surveys" className={getLinkClass('/admin-opd/surveys')} onClick={() => setIsMobileSidebarOpen(false)}>
          <ClipboardList size={20} />
          <span>Survei</span>
        </Link>
        <Link href="/admin-opd/complaints" className={getLinkClass('/admin-opd/complaints')} onClick={() => setIsMobileSidebarOpen(false)}>
          <Inbox size={20} />
          <span>Laporan</span>
        </Link>
        <Link href="/admin-opd/analytics" className={getLinkClass('/admin-opd/analytics')} onClick={() => setIsMobileSidebarOpen(false)}>
          <TrendingUp size={20} />
          <span>Statistik & Laporan</span>
        </Link>
      </nav>
      
      {/* "Keluar" kembali ke sini atas permintaan pengguna (1 September 2026),
          kini aman karena `<aside>` di atas sudah `overflow-y-auto` -- lihat
          AdminSidebarLogout untuk sebab lengkapnya. "Ganti Peran" TETAP hanya
          di ikon profil: yang diminta kembali cuma tombol keluar, dan
          menggandakan pintu ganti peran ke dua tempat tak menambah apa pun. */}
      <AdminSidebarLogout />
    </aside>
    </>
  );
}
