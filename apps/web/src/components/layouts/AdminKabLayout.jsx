import React from 'react';
import AdminKabSidebar from './AdminKabSidebar';
import AdminKabNavbar from './AdminKabNavbar';

export default function AdminKabLayout({ children }) {
  return (
    <div className="min-h-screen bg-background flex">
      <AdminKabSidebar />
      <div className="flex-1 ml-64 flex flex-col min-h-screen">
        <AdminKabNavbar />
        <main className="flex-1 pt-16">
          {children}
        </main>
        <div className="py-4 text-center border-t border-border mt-auto">
          <p className="text-sm text-text-secondary">© {new Date().getFullYear()} SKEMA Madiun. Seluruh Hak Cipta Dilindungi.</p>
        </div>
      </div>
    </div>
  );
}
