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
 * NILAI AWALNYA TAHUN BERJALAN sejak 6 Oktober 2026, dan itu PEMBALIKAN dari
 * keputusan sebelumnya -- dicatat di sini karena alasan lamanya masih benar
 * dan pembaca berikutnya berhak tahu apa yang menggantikannya.
 *
 * Dulu string kosong = tak menyaring, dengan alasan: penyaring ini
 * mempersempit angka UTAMA dashboard eksekutif lintas-OPD (berbeda dari Admin
 * OPD, yang penyaringnya hanya melingkupi satu bagian), jadi mempersempitnya
 * harus menjadi tindakan sadar pengguna.
 *
 * Yang membatalkannya: sejak penyaring periode dipisah menjadi Tahun +
 * Triwulan, pemilik produk menetapkan tahun WAJIB terisi. Penyaring tahun yang
 * wajib tak dapat sekaligus berarti "tanpa penyaring" -- dan akibatnya terukur
 * di layar sebelum diperbaiki: dropdown menampilkan "2027" sementara kotak
 * keterangan di bawahnya berbunyi "Penyaring navbar aktif: semua periode".
 *
 * Tetap TANPA triwulan (tahun saja, bukan `2026-Q4`): triwulan berjalan di
 * lingkup lintas-OPD sering belum punya satu pun survei tertutup, dan di situ
 * alasan lama masih berlaku sepenuhnya.
 *
 * Diisi di sini, bukan dibiarkan `PenyaringPeriode` melaporkannya saat
 * terpasang: nilai awal yang kosong membuat dashboard mengambil data sekali
 * tanpa penyaring lalu sekali lagi dengan penyaring.
 */
export function AdminKabLayoutProvider({ children }) {
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [periode, setPeriode] = useState(() => String(new Date().getFullYear()));

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
