'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, LogOut, Repeat } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import useKeepInViewport from '@/hooks/useKeepInViewport';
import { useLogout } from '@/hooks/useLogout';

/**
 * Menu akun untuk kedua area admin (Kabupaten & OPD): "Ganti Peran" dan
 * "Keluar", digantungkan pada ikon profil di bilah atas.
 *
 * KENAPA DIPINDAHKAN KE SINI (1 September 2026, permintaan pengguna sesudah
 * melaporkan tombol keluar "tidak terjangkau" di layar ponsel tertentu).
 *
 * Sebelumnya kedua tombol itu tinggal di dasar sidebar, di dalam blok
 * `mt-auto`, sementara `<aside>`-nya ber-`h-screen flex flex-col` TANPA
 * `overflow-y-auto`. Selama daftar menunya pendek, `mt-auto` menempelkan blok
 * itu ke dasar layar dan semuanya tampak benar. Tapi begitu isinya melebihi
 * tinggi layar -- dan itu pasti terjadi bagi SUPERUSER, yang menunya bertambah
 * "Manajemen User" dan "Audit Logs" -- blok itu terdorong keluar kotak
 * `fixed`, dan karena tak ada gulir di dalamnya sekaligus `fixed` membuatnya
 * tak ikut bergulir bersama halaman, tombolnya menjadi BENAR-BENAR tak
 * terjangkau. Bukan sekadar sulit ditekan: tak ada cara apa pun mencapainya.
 *
 * Menggantungkannya pada ikon profil menghapus seluruh kelas masalah itu:
 * bilah atas tingginya tetap, jadi jangkauan kedua tombol ini tak lagi
 * bergantung pada berapa banyak menu yang dimiliki peran pengguna. Ikon profil
 * juga tempat yang memang dicari orang untuk urusan akun.
 *
 * `user` diterima sebagai prop, bukan diambil sendiri: kedua navbar sudah
 * memanggil `getMyProfile()`, dan mengambilnya ulang di sini berarti dua
 * permintaan untuk data yang sama pada setiap muat halaman.
 */
export default function AdminAccountMenu({ user, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  // Panel dijaga tetap di dalam layar -- di ponsel, ikon ini berada di ujung
  // kanan bilah atas, jadi panel ber-`right-0` sekalipun masih bisa menjorok
  // keluar tepi kiri pada layar sempit. Lihat useKeepInViewport.
  const panelRef = useRef(null);
  useKeepInViewport(panelRef, isOpen);

  const { logout, isLoggingOut } = useLogout();
  // "Ganti Peran" kini bergantung pada JUMLAH role yang dimiliki, bukan pada
  // superuser (5 September 2026): siapa pun ber-role lebih dari satu punya
  // sesuatu untuk dipilih, dan akun ber-role tunggal tak punya apa pun.
  const bolehGantiPeran = (user?.roles?.length ?? 0) > 1;

  useEffect(() => {
    const klikLuar = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    const tekanEsc = (event) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', klikLuar);
    document.addEventListener('keydown', tekanEsc);
    return () => {
      document.removeEventListener('mousedown', klikLuar);
      document.removeEventListener('keydown', tekanEsc);
    };
  }, []);

  return (
    <div className={`relative ${className}`} ref={wrapperRef}>
      {/* Pemicu dibuat minimal 44x44 -- ini kendali utama untuk keluar dari
          aplikasi, dan di ponsel ia ditekan dengan jempol. */}
      <button
        type="button"
        onClick={() => setIsOpen((buka) => !buka)}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label="Menu akun"
        className={`flex min-h-[44px] min-w-[44px] items-center gap-1 rounded-full p-1 transition-colors hover:bg-surface-container-low ${
          isOpen ? 'bg-surface-container-low' : ''
        }`}
      >
        <Avatar
          initials={user?.initials ?? '?'}
          size="lg"
          variant="outline"
          className="h-9 w-9 border-2 border-primary/20 bg-primary-container text-xs text-on-primary-container"
        />
        <ChevronDown
          size={14}
          className={`hidden text-text-secondary transition-transform duration-200 sm:block ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 mt-2 w-[min(15rem,calc(100vw-1.5rem))] origin-top-right rounded-2xl border border-border/80 bg-surface p-2 shadow-xl shadow-slate-900/10 z-50 animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
        >
          {/* Identitas ikut ditampilkan di dalam panel karena di ponsel nama &
              perannya tak muat di bilah atas -- di sana hanya ada ikonnya. */}
          <div className="mb-1 border-b border-border/60 px-3 py-2">
            <p className="truncate text-sm font-bold text-text-primary" title={user?.name ?? undefined}>
              {user?.name ?? 'Pengguna'}
            </p>
            <p className="truncate text-xs text-text-secondary">{user?.roleLabel ?? '-'}</p>
          </div>

          {/* "Ganti Peran" hanya untuk akun yang benar-benar memegang lebih
              dari satu peran -- akun berperan tunggal tak punya tujuan untuk
              berpindah, jadi menampilkannya hanya membingungkan. */}
          {bolehGantiPeran && (
            <Link
              href="/pilih-peran"
              role="menuitem"
              onClick={() => setIsOpen(false)}
              className="flex min-h-[44px] items-center gap-3 rounded-xl px-3 text-sm font-medium text-text-primary transition-colors hover:bg-surface-container-low"
            >
              <Repeat size={18} className="shrink-0 text-text-secondary" aria-hidden="true" />
              <span>Ganti Peran</span>
            </Link>
          )}

          <button
            type="button"
            role="menuitem"
            onClick={logout}
            disabled={isLoggingOut}
            className="flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-error transition-colors hover:bg-error-container/40 disabled:opacity-50"
          >
            <LogOut size={18} className="shrink-0" aria-hidden="true" />
            <span>{isLoggingOut ? 'Keluar...' : 'Keluar'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
