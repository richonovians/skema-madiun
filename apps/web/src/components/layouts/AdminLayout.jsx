import React from 'react';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <AdminSidebar />
      <AdminNavbar />
      
      <main className="ml-64 pt-24 p-lg space-y-lg min-h-screen">
        {children}
      </main>

      <footer className="ml-64 py-6 text-center text-sm font-medium text-secondary">
        © {new Date().getFullYear()} Pemerintah Daerah Kabupaten Madiun - Dashboard Kinerja OPD
      </footer>
    </div>
  );
}
