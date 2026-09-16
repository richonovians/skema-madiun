'use client';
import React from 'react';
import AdminSidebar from './AdminSidebar';
import AdminNavbar from './AdminNavbar';
import { AdminLayoutProvider, useAdminLayout } from './AdminLayoutProvider';

export default function AdminLayout({ children }) {
  return (
    <AdminLayoutProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminLayoutProvider>
  );
}

function AdminLayoutInner({ children }) {
  const { isDesktopSidebarCollapsed } = useAdminLayout();
  const sidebarMargin = isDesktopSidebarCollapsed ? 'md:ml-20' : 'md:ml-64';

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <AdminSidebar />
      <AdminNavbar />
      
      {/* Ruang untuk bilah atas yang `fixed` -- DIUKUR, bukan dipatok.
          `pt-20 md:pt-24` yang lama (80/96px) cocok selama bilahnya selalu
          satu baris 64px. Sejak bilah itu jadi dua baris di ponsel supaya
          nama OPD terbaca (1 September 2026), tingginya berbeda antara
          dashboard dan halaman lain, jadi angka tetap mana pun pasti salah
          di salah satunya: terlalu kecil menyembunyikan judul halaman di
          balik bilah, terlalu besar meninggalkan lubang kosong.
          Pengisi nilainya AdminNavbar.jsx; nilai pembukanya di globals.css.
          `+1rem` menjaga jarak yang sama seperti dulu: `pt-20` (80px) atas
          bilah 64px menyisakan 16px, dan `pt-*` menimpa sisi atas `p-4`
          sehingga tanpa tambahan ini isi halaman akan menempel ke bilah.

          `md:pt-24` DIBUANG (2 September 2026): angka tetap 96px itu menimpa
          hasil pengukuran justru di rentang lebar yang paling berubah. Sejak
          bilahnya boleh dua baris sampai `xl` -- perbaikan tampilan tablet,
          lihat AdminNavbar.jsx -- tinggi 127-133px di 768-1279 akan tertutup
          oleh angka itu. Satu sumber tinggi saja, dan itu yang diukur.

          SEKALIGUS `p-4 md:p-lg` DIPECAH menjadi `px-*` + `pb-*`. Ini bukan
          kerapian, melainkan penutup jebakan yang langsung terbukti: `md:p-lg`
          adalah SHORTHAND BERVARIAN, dan Tailwind v4 mengurutkannya SESUDAH
          `pt-[calc(...)]` yang tanpa varian. Jadi begitu `md:pt-24` hilang,
          padding atas di md+ jatuh ke 24px -- terukur `padding-top: 24px`
          padahal bilahnya 80px tinggi, dan judul halaman masuk ke bawah
          bilah. Selama `md:pt-24` masih ada, ia yang menutupi gejala itu.
          Dengan `p` tak lagi menyentuh sisi atas, tak ada apa pun yang bisa
          menimpa hasil pengukuran lagi. */}
      <main className={`${sidebarMargin} transition-all duration-300 pt-[calc(var(--tinggi-navbar-opd)+1rem)] px-4 pb-4 md:px-lg md:pb-lg space-y-4 md:space-y-lg min-h-screen`}>
        {children}
      </main>

      <footer className={`${sidebarMargin} transition-all duration-300 py-6 text-center text-sm font-medium text-secondary`}>
        © {new Date().getFullYear()} Pemerintah Daerah Kabupaten Madiun - Dashboard Kinerja OPD
      </footer>
    </div>
  );
}
