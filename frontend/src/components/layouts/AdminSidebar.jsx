'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  ClipboardList,
  Inbox,
  TrendingUp, 
  Settings, 
  HelpCircle, 
  LogOut,
  X
} from 'lucide-react';

export default function AdminSidebar({ isOpen, setIsOpen }) {
  const pathname = usePathname();

  const handleNavClick = () => {
    if (setIsOpen) setIsOpen(false);
  };

  const getLinkClass = (path) => {
    // Exact match or active section
    const isActive = pathname === path || pathname.startsWith(`${path}/`);
    
    return isActive
      ? "flex items-center gap-md px-md py-sm bg-blue-600 text-white rounded-lg font-bold transition-all duration-150"
      : "flex items-center gap-md px-md py-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors rounded-lg";
  };

  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 transition-opacity"
          onClick={() => setIsOpen && setIsOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`bg-slate-900 text-slate-300 font-body-md text-body-md h-screen w-64 fixed left-0 top-0 shadow-xl flex flex-col py-md px-sm z-50 transform transition-transform duration-300 ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="mb-xl px-md flex justify-between items-start">
          <div>
            <h1 className="font-headline-md text-headline-md font-bold text-blue-400">Admin OPD</h1>
            <p className="text-sm opacity-60">Portal Analitik</p>
          </div>
          <button 
            onClick={() => setIsOpen && setIsOpen(false)}
            className="md:hidden p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>
      
      <nav className="flex-1 space-y-sm">
        <Link href="/admin-opd/dashboard" onClick={handleNavClick} className={getLinkClass('/admin-opd/dashboard')}>
          <LayoutDashboard size={20} />
          <span>Dashboard</span>
        </Link>
        <Link href="/admin-opd/surveys" onClick={handleNavClick} className={getLinkClass('/admin-opd/surveys')}>
          <ClipboardList size={20} />
          <span>Survei</span>
        </Link>
        <Link href="/admin-opd/complaints" onClick={handleNavClick} className={getLinkClass('/admin-opd/complaints')}>
          <Inbox size={20} />
          <span>Laporan</span>
        </Link>
        <Link href="/admin-opd/analytics" onClick={handleNavClick} className={getLinkClass('/admin-opd/analytics')}>
          <TrendingUp size={20} />
          <span>Statistik & Laporan</span>
        </Link>
      </nav>
      
      <div className="mt-auto pt-lg border-t border-slate-800 flex flex-col gap-sm">
        <button className="bg-blue-600 text-white font-bold py-sm rounded-lg hover:opacity-90 transition-all">
          Cetak Laporan
        </button>
        <Link href="/admin-opd/help" onClick={handleNavClick} className="flex items-center gap-md px-md py-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors rounded-lg">
          <HelpCircle size={20} />
          <span>Bantuan</span>
        </Link>
        <button className="flex items-center gap-md px-md py-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors rounded-lg w-full text-left">
          <LogOut size={20} />
          <span>Keluar</span>
        </button>
      </div>
    </aside>
    </>
  );
}
