'use client';
import React from 'react';
import AdminKabSidebar from './AdminKabSidebar';
import AdminKabNavbar from './AdminKabNavbar';
import { AdminKabLayoutProvider, useAdminKabLayout } from './AdminKabLayoutProvider';

export default function AdminKabLayout({ children }) {
  return (
    <AdminKabLayoutProvider>
      <AdminKabLayoutInner>{children}</AdminKabLayoutInner>
    </AdminKabLayoutProvider>
  );
}

function AdminKabLayoutInner({ children }) {
  const { isDesktopSidebarCollapsed } = useAdminKabLayout();
  const sidebarMargin = isDesktopSidebarCollapsed ? 'md:ml-20' : 'md:ml-64';

  return (
    <div className="min-h-screen bg-background flex overflow-hidden">
      <AdminKabSidebar />
      <div className={`flex-1 ${sidebarMargin} flex flex-col min-h-screen min-w-0 transition-all duration-300`}>
        <AdminKabNavbar />
        {/* Ruang untuk bilah atas yang `fixed` -- diukur, bukan dipatok.
            `pt-[110px] md:pt-20` yang lama tak pernah bisa benar: tinggi
            AdminKabNavbar berubah menurut halaman, lebar layar, DAN data
            yang baru tiba. Alasan lengkapnya di AdminKabNavbar.jsx, yang
            juga pengisi nilai variabelnya. */}
        <main className="flex-1 pt-[var(--tinggi-navbar-kab)]">
          {children}
        </main>
        <div className="py-4 text-center border-t border-border mt-auto">
          <p className="text-sm text-text-secondary">© {new Date().getFullYear()} SKEMA Madiun. Seluruh Hak Cipta Dilindungi.</p>
        </div>
      </div>
    </div>
  );
}
