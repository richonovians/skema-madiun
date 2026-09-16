'use client';

import React from 'react';
import { LogOut } from 'lucide-react';
import { useLogout } from '@/hooks/useLogout';

/**
 * Tombol "Keluar" di dasar sidebar, dipakai kedua area admin (Kabupaten & OPD).
 *
 * DIMINTA KEMBALI oleh pengguna (1 September 2026) sesudah kedua tombol akun
 * dipindahkan ke ikon profil pagi ini. Yang berubah bukan cuma tempatnya --
 * sebab kegagalan yang lama sudah hilang lebih dulu:
 *
 *   Dulu blok `mt-auto` ini tinggal di dalam `<aside>` ber-`h-screen
 *   flex flex-col` TANPA `overflow-y-auto`. `mt-auto` menempel ke dasar KOTAK
 *   sidebar, bukan dasar layar, jadi begitu daftar menu melebihi tinggi layar
 *   -- pasti terjadi pada superuser, yang menunya bertambah dua -- blok ini
 *   terdorong keluar kotak `fixed`. Karena `fixed` tak ikut bergulir bersama
 *   halaman dan tak ada gulir di dalam sidebar, tombolnya jadi BENAR-BENAR
 *   tak terjangkau.
 *
 *   Kedua sidebar sekarang ber-`overflow-y-auto overscroll-contain`. Dengan
 *   itu, menu yang lebih tinggi dari layar bisa digulir di dalam sidebar dan
 *   tombol ini selalu bisa dicapai -- itulah sebabnya ia boleh kembali ke
 *   sini tanpa mengulang cacat yang sama. `shrink-0` melengkapinya: tanpa itu,
 *   sebagai anak flex ia bisa dimampatkan sampai tingginya nol saat ruang
 *   menyempit, dan "ada tapi setinggi 0px" sama tak berguna dengan hilang.
 *
 * Tombol di ikon profil TIDAK dihapus. Keduanya sengaja hidup bersama: yang
 * di sidebar adalah yang dicari orang saat sudah terbiasa dengan panel admin,
 * dan yang di ikon profil satu-satunya yang tetap ada saat sidebar ponsel
 * sedang tertutup.
 */
export default function AdminSidebarLogout({ isCollapsed }) {
  const { logout, isLoggingOut } = useLogout();

  return (
    <div className="mt-auto shrink-0 pt-md">
      <div className="mx-md mb-md border-t border-slate-200"></div>
      <button
        type="button"
        onClick={logout}
        disabled={isLoggingOut}
        className={`flex w-full min-h-[44px] items-center gap-md rounded-lg py-sm font-medium text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 relative group ${
          isCollapsed ? 'justify-center px-0' : 'px-md'
        }`}
        title="Keluar"
      >
        <LogOut size={20} className="shrink-0" aria-hidden="true" />
        {!isCollapsed && (
          <span>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>
        )}
      </button>
    </div>
  );
}
