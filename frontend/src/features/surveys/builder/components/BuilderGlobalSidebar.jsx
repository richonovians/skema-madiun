import React from 'react';
import { LayoutDashboard, ClipboardList, MessageSquare, TrendingUp, Settings, Building2 } from 'lucide-react';
import Link from 'next/link';

export default function BuilderGlobalSidebar() {
  const activeClass = "w-12 h-12 rounded-lg flex items-center justify-center bg-blue-600 text-white shadow-lg transition-all";
  const inactiveClass = "w-12 h-12 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-800 transition-colors";

  return (
    <aside className="w-[72px] bg-slate-900 flex flex-col items-center py-lg gap-lg relative z-40 h-full shadow-xl px-sm border-r border-slate-800">
      <div className="w-10 h-10 flex items-center justify-center mb-md">
        <Building2 className="text-blue-400" size={28} />
      </div>
      <nav className="flex flex-col gap-sm">
        <Link href="/admin-opd/dashboard" className={inactiveClass} title="Dashboard">
          <LayoutDashboard size={20} />
        </Link>
        <Link href="/admin-opd/surveys" className={activeClass} title="Survei">
          <ClipboardList size={20} />
        </Link>
        <Link href="/admin-opd/complaints" className={inactiveClass} title="Pengaduan">
          <MessageSquare size={20} />
        </Link>
        <Link href="/admin-opd/statistics" className={inactiveClass} title="Statistik & Laporan">
          <TrendingUp size={20} />
        </Link>
      </nav>
      <div className="mt-auto flex flex-col gap-sm">
        <Link href="/admin-opd/settings" className={inactiveClass} title="Pengaturan">
          <Settings size={20} />
        </Link>
      </div>
    </aside>
  );
}
