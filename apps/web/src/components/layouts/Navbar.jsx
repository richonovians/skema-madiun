'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import Image from 'next/image';
import { Menu, X } from 'lucide-react';
import RegistrasiHelpdeskLink from '@/features/authentication/components/RegistrasiHelpdeskLink';
import ProfileAvatarDropdown from '@/features/profile/components/ProfileAvatarDropdown';
import NotificationDropdown from '@/components/ui/NotificationDropdown';
import {
  isAuthenticated,
  SESSION_CHANGED_EVENT,
} from '@/features/authentication/services/authStorage';

export default function Navbar() {
  const pathname = usePathname();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const hitungUlang = () => setIsLoggedIn(isAuthenticated());
    hitungUlang();
    // Sesi bisa dinyatakan tak sah KAPAN SAJA setelah mount: interceptor 401 di
    // api.js membuang artefaknya begitu ada panggilan yang ditolak. Tanpa
    // langganan ini navbar terus memercayai keputusan yang diambilnya sekali di
    // awal, sehingga menu akun tetap terpasang untuk sesi yang sudah mati --
    // berisi "?" karena profilnya jelas gagal dimuat, dan tak hilang walau
    // halaman dimuat ulang (keluhan 28 Agustus 2026).
    window.addEventListener(SESSION_CHANGED_EVENT, hitungUlang);
    return () => window.removeEventListener(SESSION_CHANGED_EVENT, hitungUlang);
  }, []);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Spacer agar konten di bawah navbar tidak tertutup — nav adalah fixed
          sehingga tidak mendorong flow sendiri; spacer ini penggantinya. */}
      <div className="h-20" aria-hidden="true" />

      <nav
        className={clsx(
          'fixed top-0 left-0 right-0 z-50 transition-all duration-300 ease-in-out',
          'flex justify-center items-start pt-3 px-4 sm:px-6',
        )}
      >
        {/* Pill container glassmorphism —
            Sebelum scroll: hampir transparan, border sangat tipis, shadow nihil
            → menyatu dengan background putih hero sehingga navbar terasa "melayang"
            di atas halaman tanpa batas.
            Setelah scroll: glass putih solid dengan blur kuat & shadow biru lembut. */}
        <div
          className={clsx(
            'w-full max-w-[1200px] h-14 flex items-center justify-between px-4 sm:px-5',
            'rounded-2xl border transition-all duration-500',
            scrolled
              ? 'bg-white/80 backdrop-blur-xl border-slate-200/70 shadow-[0_8px_32px_rgba(0,74,198,0.10)]'
              : 'bg-white/30 backdrop-blur-sm border-white/20 shadow-none',
          )}
        >
          {/* Logo */}
          {/* `min-w-0`, BUKAN `shrink-0`. Sejak namanya ikut tampil di layar
              kecil, tautan yang menolak menyusut membawa seluruh blok merek
              mendorong kelompok kanan navbar -- avatar dan tombol menu -- 28px
              ke luar layar pada 320px. Lambangnya tetap `shrink-0` di dalam. */}
          <Link href="/" className="flex items-center gap-2.5 group min-w-0 min-h-[44px]">
            <div className="shrink-0 transition-transform duration-300 group-hover:scale-105 flex items-center">
              {/* 120x80, BUKAN 120x64 (23 September 2026). Berkasnya 1536x1024,
                  yaitu 3:2; deklarasi lama 1,875 membuat Next memesan ruang
                  berbentuk keliru dan memperingatkannya di konsol peramban.
                  Logo yang terlihat tidak berubah: `h-8 w-auto` mengunci
                  tingginya 32px dan `object-contain` sudah menggambarnya pada
                  48x32 -- yang menyusut hanya pita transparan di kiri-kanan. */}
              <Image
                src="/images/navbar/skema-logo-2.png"
                alt="Logo SKEMA"
                width={120}
                height={80}
                className="object-contain h-8 md:h-10 w-auto scale-110 origin-left"
                priority
              />
            </div>
            {/* Tampil sejak lebar terkecil (15 September 2026, permintaan
                pengguna). Sebelumnya `hidden sm:block`, jadi lenyap di bawah
                640px -- lebar hampir semua ponsel. Terukur pada 360px: navbar
                cuma berisi lambang ~30px dan tombol menu ~40px, menyisakan
                sekitar 250px kosong; yang disembunyikan bukan sesuatu yang tak
                muat.

                `truncate` menahan pertukaran yang lebih buruk: nama yang
                memanjang sampai mendorong tombol menu keluar layar. Ia butuh
                `min-w-0` pada dirinya sendiri karena induknya baris flex, dan
                item flex menolak menyusut di bawah lebar isinya secara baku. */}
            <span className="font-h3 text-base sm:text-lg md:text-xl text-primary font-bold tracking-tight truncate min-w-0">
              SKEMA Madiun
            </span>
          </Link>

          {/* Nav links — desktop
              `lg`, BUKAN `md` (16 September 2026, laporan pengguna). Pada 768px
              titik `md` menyalakan ketiga tautan ini sekaligus mematikan tombol
              menu, sementara tombol registrasi tetap di tempatnya. Terukur: pil
              navbar 720px harus memuat merek 183px + tautan 289px + tombol 206px
              beserta jaraknya, dan merek -- satu-satunya yang boleh menyusut --
              menanggung seluruh kekurangannya sendirian, tersisa 112px dari
              147px yang dibutuhkan. Pita yang terkena 768-899px. */}
          <div data-tautan-desktop className="hidden lg:flex items-center gap-1">
            {[
              { href: '/', label: 'Beranda' },
              { href: '/about', label: 'Tentang Platform' },
              { href: '/statistics', label: 'Statistik' },
            ].map(({ href, label }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={clsx(
                    'relative px-4 py-1.5 rounded-xl text-sm font-medium transition-all duration-200',
                    'min-h-[36px] flex items-center',
                    active
                      ? 'text-primary bg-primary/10'
                      : 'text-text-secondary hover:text-primary hover:bg-primary/5',
                  )}
                >
                  {label}
                  {active && (
                    <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* CTA / Auth actions */}
          <div className="flex items-center gap-2">
            {isLoggedIn ? (
              <>
                {/* Warga = penerima notifikasi utama (status pengaduan/balasan,
                    D9) tapi SEBELUMNYA tak ada lonceng sama sekali di sini
                    (temuan audit 2026-08-05) -- AdminNavbar sudah punya lebih
                    dulu, di sini baru dipasang. */}
                <NotificationDropdown />
                <ProfileAvatarDropdown />
              </>
            ) : (
              /* Tombol masuk SSO tak lagi di sini: sejak 14 September 2026 ia
                 berada di hero, tepat di bawah kalimat pembuka. Yang tinggal di
                 navbar adalah jalan bagi orang yang BELUM punya akun. */
              <div className="hidden sm:block">
                <RegistrasiHelpdeskLink />
              </div>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={clsx(
                'lg:hidden flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200',
                'text-slate-600 hover:text-primary hover:bg-primary/8 focus:outline-none focus:ring-2 focus:ring-primary/20',
              )}
              aria-label={isMobileMenuOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            >
              {isMobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer — muncul tepat di bawah pill navbar */}
        {isMobileMenuOpen && (
          <div
            className={clsx(
              'absolute top-[72px] left-4 right-4 lg:hidden',
              'rounded-2xl border border-white/60 shadow-[0_8px_32px_rgba(0,74,198,0.13)]',
              'bg-white/80 backdrop-blur-xl',
              'animate-in slide-in-from-top-3 fade-in duration-200',
            )}
          >
            <div className="flex flex-col p-3 gap-1">
              {[
                { href: '/', label: 'Beranda' },
                { href: '/about', label: 'Tentang Platform' },
                { href: '/statistics', label: 'Statistik' },
              ].map(({ href, label }) => {
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={clsx(
                      'flex items-center px-4 py-3 rounded-xl font-medium text-base transition-all duration-200 min-h-[44px]',
                      active
                        ? 'bg-primary/10 text-primary font-semibold'
                        : 'text-text-secondary hover:bg-primary/5 hover:text-primary',
                    )}
                  >
                    {label}
                  </Link>
                );
              })}

              {/* Ikut dipasang di drawer: tanpa ini pengguna ponsel kehilangan
                  satu-satunya jalan mendaftar, sebab tombol di baris navbar
                  disembunyikan di bawah `sm`. */}
              {!isLoggedIn && (
                <div className="pt-3 mt-1 border-t border-border/50">
                  <RegistrasiHelpdeskLink className="w-full" />
                </div>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
