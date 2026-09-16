'use client';
import React, { createContext, useContext, useState } from 'react';

const AdminKabLayoutContext = createContext({
  isMobileSidebarOpen: false,
  setIsMobileSidebarOpen: () => {},
  periode: '',
  setPeriode: () => {},
});

/**
 * State bersama layout Admin Kabupaten.
 *
 * `periode` ({tahun}-Q{1-4}) adalah parameter yang memang diterima
 * `GET /dashboard/ikm`, jadi penyaring di navbar benar-benar menyaring di
 * server -- bukan menulis query param yang tak pernah dibaca komponen mana pun.
 *
 * Penyaring jenis layanan DIBUANG 15 September 2026 atas permintaan pengguna.
 * Backend tetap menerima parameternya; yang hilang hanya kendali di layar,
 * sehingga hitungan pengaduan -- satu-satunya angka yang dulu mengikutinya --
 * kini selalu utuh.
 *
 * Kosong = tak menyaring (parameternya tak dikirim), dan itulah NILAI
 * AWALNYA. Berbeda dari penyaring Admin OPD yang default-nya triwulan berjalan:
 * di sana penyaring hanya melingkupi satu bagian di samping kartu kumulatif,
 * sedangkan di sini ia mempersempit angka UTAMA dashboard eksekutif. Dashboard
 * lintas-OPD yang langsung tampil kosong hanya karena triwulan berjalan belum
 * punya survei bernilai bukan default yang berguna -- mempersempit harus jadi
 * tindakan sadar pengguna.
 */
export function AdminKabLayoutProvider({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [periode, setPeriode] = useState('');

  return (
    <AdminKabLayoutContext.Provider
      value={{
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        isDesktopSidebarCollapsed,
        setIsDesktopSidebarCollapsed,
        periode,
        setPeriode,
      }}
    >
      {children}
    </AdminKabLayoutContext.Provider>
  );
}

export const useAdminKabLayout = () => useContext(AdminKabLayoutContext);
