'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authApi } from '@/features/authentication/services/sso.api';
import { clearSession } from '@/features/authentication/services/authStorage';

/**
 * Logout bersama (2026-08-06) -- sebelumnya dipakai hanya di ProfileActions.jsx,
 * tombol "Keluar" di AdminKabSidebar.jsx & AdminSidebar.jsx tak punya handler
 * sama sekali (laporan bug user). Diekstrak ke hook supaya 3 tempat ini tak
 * diam-diam tak sinkron.
 *
 * Catatan: ProfileActions.jsx sudah TIDAK ADA lagi (dihapus 4 Oktober 2026,
 * tombol Logout di halaman profil dibuang karena menduakan menu akun di
 * navbar). Ia disebut di sini hanya sebagai riwayat; jangan dicari.
 */
export function useLogout() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } catch {
      // Logout stateless di backend -- tetap hapus sesi lokal walau request gagal.
    }
    clearSession();
    router.push('/');
  };

  return { logout, isLoggingOut };
}
