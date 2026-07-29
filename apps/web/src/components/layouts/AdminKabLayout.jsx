import React from 'react';
import AdminKabSidebar from './AdminKabSidebar';
import AdminKabNavbar from './AdminKabNavbar';
import { AdminKabLayoutProvider } from './AdminKabLayoutProvider';

export default function AdminKabLayout({ children }) {
  return (
    <AdminKabLayoutProvider>
      <div className="min-h-screen bg-background flex overflow-hidden">
        <AdminKabSidebar />
        <div className="flex-1 md:ml-64 flex flex-col min-h-screen min-w-0">
          <AdminKabNavbar />
          <main className="flex-1 pt-[110px] md:pt-20">
            {children}
          </main>
          <div className="py-4 text-center border-t border-border mt-auto">
            <p className="text-sm text-text-secondary">© {new Date().getFullYear()} SKEMA Madiun. Seluruh Hak Cipta Dilindungi.</p>
          </div>
        </div>
      </div>
    </AdminKabLayoutProvider>
  );
}
