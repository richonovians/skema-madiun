'use client';
import React, { createContext, useContext, useState } from 'react';

const AdminKabLayoutContext = createContext({
  isMobileSidebarOpen: false,
  setIsMobileSidebarOpen: () => {},
  periode: '',
  setPeriode: () => {},
  jenisLayanan: '',
  setJenisLayanan: () => {},
});

/**
 * State bersama layout Admin Kabupaten.
 *
 * `periode` ({tahun}-Q{1-4}) & `jenisLayanan` adalah DUA parameter yang memang
 * diterima `GET /dashboard/ikm` (DashboardIkmQueryDto backend: `periode` +
 * `jenisLayanan`), jadi penyaring di navbar sekarang benar-benar menyaring di
 * server -- bukan lagi menulis query param `?year=&service=` yang tak pernah
 * dibaca komponen mana pun.
 *
 * Keduanya kosong = tak menyaring (parameternya tak dikirim), dan itulah NILAI
 * AWALNYA. Berbeda dari penyaring Admin OPD yang default-nya triwulan berjalan:
 * di sana penyaring hanya melingkupi satu bagian di samping kartu kumulatif,
 * sedangkan di sini ia mempersempit angka UTAMA dashboard eksekutif. Dashboard
 * lintas-OPD yang langsung tampil kosong hanya karena triwulan berjalan belum
 * punya survei bernilai bukan default yang berguna -- mempersempit harus jadi
 * tindakan sadar pengguna.
 */
export function AdminKabLayoutProvider({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [periode, setPeriode] = useState('');
  const [jenisLayanan, setJenisLayanan] = useState('');

  return (
    <AdminKabLayoutContext.Provider
      value={{
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        periode,
        setPeriode,
        jenisLayanan,
        setJenisLayanan,
      }}
    >
      {children}
    </AdminKabLayoutContext.Provider>
  );
}

export const useAdminKabLayout = () => useContext(AdminKabLayoutContext);
