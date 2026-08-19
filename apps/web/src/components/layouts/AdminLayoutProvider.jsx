'use client';

import React, { createContext, useContext, useState } from 'react';
import { periodeFromDate } from '@/features/surveys/adapters/survey.adapter';

const AdminLayoutContext = createContext();

/**
 * State bersama layout Admin OPD.
 *
 * `periode` (format kanonik `{tahun}-Q{1-4}`, sama seperti `Survey.periode`)
 * ditaruh DI SINI, bukan di dalam AdminNavbar: penyaring triwulan ada di navbar
 * sementara yang menampilkan datanya adalah halaman dashboard, dan keduanya
 * bersaudara di bawah AdminLayout. SEBELUMNYA state itu lokal di AdminNavbar
 * (`useState('q1')`) sehingga tak seorang pun bisa membacanya -- memilih
 * triwulan sama sekali tak berpengaruh ke tampilan mana pun.
 *
 * Nilai awal = triwulan berjalan (bukan selalu Triwulan I seperti sebelumnya).
 */
export function AdminLayoutProvider({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [periode, setPeriode] = useState(() => periodeFromDate(new Date()));

  return (
    <AdminLayoutContext.Provider
      value={{ isMobileSidebarOpen, setIsMobileSidebarOpen, periode, setPeriode }}
    >
      {children}
    </AdminLayoutContext.Provider>
  );
}

export function useAdminLayout() {
  const context = useContext(AdminLayoutContext);
  if (context === undefined) {
    throw new Error('useAdminLayout must be used within an AdminLayoutProvider');
  }
  return context;
}
