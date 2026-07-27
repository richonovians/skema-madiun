'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Building2,
  Users,
  LogOut
} from 'lucide-react';

export default function AdminKabSidebar() {
  const pathname = usePathname();

  const getLinkClass = (path) => {
    // Exact match or active section
    const isActive = pathname === path || pathname.startsWith(`${path}/`);
    
    return isActive
      ? "flex items-center gap-md px-md py-sm bg-blue-600 text-white rounded-lg font-bold transition-all duration-150"
      : "flex items-center gap-md px-md py-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors rounded-lg";
  };

  return (
    <aside className="bg-slate-900 text-slate-300 font-body-md text-body-md h-screen w-64 fixed left-0 top-0 shadow-xl flex flex-col py-md px-sm z-50">
      <div className="mb-xl px-md">
        <h1 className="font-headline-md text-headline-md font-bold text-blue-400">Admin Kabupaten</h1>
        <p className="text-sm opacity-60">Portal Eksekutif</p>
      </div>
      
      <nav className="flex-1 space-y-sm">
        <Link href="/admin-kab/dashboard" className={getLinkClass('/admin-kab/dashboard')}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/admin-kab/opd" className={getLinkClass('/admin-kab/opd')}>
          <Building2 size={20} />
          <span>Manajemen OPD</span>
        </Link>
        <Link href="/admin-kab/users" className={getLinkClass('/admin-kab/users')}>
          <Users size={20} />
          <span>Manajemen User</span>
        </Link>
      </nav>
      
      <div className="mt-auto pt-lg border-t border-slate-800 flex flex-col gap-sm">
        <button className="flex items-center gap-md px-md py-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors rounded-lg w-full text-left">
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
  );
}
