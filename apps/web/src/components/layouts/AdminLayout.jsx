import React from 'react';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';
import { AdminLayoutProvider } from './AdminLayoutProvider';

export default function AdminLayout({ children }) {
  return (
    <AdminLayoutProvider>
      <div className="min-h-screen bg-background text-on-surface">
        <AdminSidebar />
        <AdminNavbar />
        
        <main className="md:ml-64 pt-20 md:pt-24 p-4 md:p-lg space-y-4 md:space-y-lg min-h-screen">
          {children}
        </main>

        <footer className="md:ml-64 py-6 text-center text-sm font-medium text-secondary">
          © {new Date().getFullYear()} Pemerintah Daerah Kabupaten Madiun - Dashboard Kinerja OPD
        </footer>
      </div>
    </AdminLayoutProvider>
  );
}
