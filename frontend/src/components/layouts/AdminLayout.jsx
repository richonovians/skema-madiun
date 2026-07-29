'use client';
import React, { useState } from 'react';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';

export default function AdminLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <AdminSidebar isOpen={isMobileMenuOpen} setIsOpen={setIsMobileMenuOpen} />
      <AdminNavbar onMenuClick={() => setIsMobileMenuOpen(true)} />
      
      <main className="md:ml-64 pt-24 px-4 pb-4 md:pt-28 md:px-lg md:pb-lg space-y-6 md:space-y-lg min-h-screen flex flex-col">
        {children}
      </main>

      <footer className="md:ml-64 py-6 text-center text-xs md:text-sm font-medium text-secondary">
        © {new Date().getFullYear()} Pemerintah Daerah Kabupaten Madiun - Dashboard Kinerja OPD
      </footer>
    </div>
  );
}
