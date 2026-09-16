'use client';

import React, { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, CalendarRange } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import NotificationDropdown from '@/components/ui/NotificationDropdown';
import ProfileLoadError from '@/components/ui/ProfileLoadError';
import AdminAccountMenu from './AdminAccountMenu';
import { useAdminLayout } from './AdminLayoutProvider';
import { useAsync } from '@/hooks/useAsync';
import { isUnauthorizedError } from '@/services/api';
import { getMyProfile } from '@/features/profile/services/profile.api';
import { getOpdById } from '@/features/opd/services/opd.api';
import { buildRecentPeriodeOptions } from '@/features/surveys/adapters/survey.adapter';

const PERIODE_OPTIONS = buildRecentPeriodeOptions();

/**
 * Navbar Admin OPD.
 *
 * SEBELUMNYA seluruh identitas di sini karangan: nama OPD di-hardcode "Dinas
 * Kesehatan", pengguna "Dr. Handoko / Kepala Dinas", dan fotonya diambil dari
 * URL googleusercontent milik mockup desain. Siapa pun yang login melihat
 * identitas orang yang tidak ada -- termasuk nama OPD yang bukan OPD-nya.
 * Kini semuanya dari GET /auth/me + GET /opd/:id.
 *
 * Catatan jabatan: backend TAK PUNYA field jabatan sama sekali (skema User cuma
 * nama/email/role/opdId), jadi baris kedua memakai label PERAN ("Admin OPD")
 * -- bukan "Kepala Dinas" yang tak pernah ada sumbernya.
 *
 * Foto profil: `avatarUrl` juga tak ada di backend (lihat catatan gap
 * me.adapter.js), jadi dipakai inisial lewat Avatar.jsx. Ini sekaligus
 * menghapus satu permintaan gambar ke host eksternal dari tiap halaman admin.
 */
export default function AdminNavbar() {
  const { isMobileSidebarOpen, setIsMobileSidebarOpen, isDesktopSidebarCollapsed, periode, setPeriode } = useAdminLayout();
  const pathname = usePathname();

  // Penyaring triwulan HANYA ditampilkan di dashboard -- itu satu-satunya
  // halaman yang membacanya (lihat AdminLayoutProvider). Menampilkannya di
  // halaman lain justru mengulang masalah lama: kontrol yang tak berefek apa pun.
  const showPeriodeFilter = pathname?.startsWith('/admin-opd/dashboard');

  const fetchIdentity = useCallback(async () => {
    const user = await getMyProfile();
    // Admin Kabupaten boleh membuka halaman /admin-opd/* (lihat proxy.js) dan
    // TIDAK tertaut ke OPD mana pun -- jangan paksa panggil /opd/null.
    const opd = user.opdId != null ? await getOpdById(user.opdId) : null;
    return { user, opd };
  }, []);

  const { data: identity, isLoading, error, refetch } = useAsync(fetchIdentity);
  const user = identity?.user;
  const opd = identity?.opd;

  // `error` dulu tak pernah diambil, sehingga kegagalan memuat identitas tampil
  // sebagai data: "Pengguna" / "-" / "?" (2026-08-28). Lihat alasan lengkap &
  // pembedaan 401-vs-jaringan di ProfileLoadError.jsx dan api.js.
  const gagalIdentitas = error != null;
  const alasanGagal = isUnauthorizedError(error) ? 'expired' : 'offline';

  const titleText = opd?.name ?? (user?.actingRole === 'ADMIN_KABUPATEN' ? 'Lintas OPD' : 'Panel Admin OPD');

  /**
   * Tinggi nyata bilah ini dilaporkan ke `--tinggi-navbar-opd`, yang dipakai
   * <main> di AdminLayout untuk menyisakan ruang -- bilahnya `fixed`, jadi ia
   * keluar dari alur tata letak dan tak mendorong apa pun.
   *
   * Perlu diukur, bukan dipatok, sejak bilah ini jadi dua baris di ponsel
   * (1 September 2026): tingginya kini berbeda antara dashboard (ada baris
   * penyaring triwulan) dan halaman lain (tidak ada), jadi `pt-20 md:pt-24`
   * yang lama pasti salah di salah satu dari keduanya. Pola & alasan sama
   * persis dengan AdminKabNavbar.
   */
  const headerRef = useRef(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return undefined;

    const observer = new ResizeObserver(([entry]) => {
      const tinggi = entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height;
      document.documentElement.style.setProperty('--tinggi-navbar-opd', `${Math.ceil(tinggi)}px`);
    });
    observer.observe(el);

    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--tinggi-navbar-opd');
    };
  }, []);

  /**
   * TATA LETAK PONSEL: DUA BARIS (1 September 2026, laporan pengguna "navbar
   * terlihat kurang tertata & tulisan Panel Admin OPD tak terlihat").
   *
   * Sebelumnya semuanya dipaksa satu baris 64px: hamburger, judul, penyaring
   * triwulan, lonceng, dan avatar. Penyaringnya `shrink-0` sedangkan judulnya
   * `truncate` di dalam `flex-1 min-w-0`, jadi SELURUH kekurangan ruang
   * ditanggung judul sendirian -- di 360px ia tersisa satu huruf: "P...".
   * Lebar yang tersedia untuk judul cuma ~40px, dan tak ada ukuran layar hp
   * mana pun yang cukup untuk kelimanya berjajar.
   *
   * Sekarang barisnya dibiarkan membungkus: penyaring triwulan diberi
   * `order-last w-full` sehingga di ponsel ia turun ke barisnya sendiri
   * selebar layar, menyisakan seluruh sisa baris pertama untuk judul. Di md+
   * `md:order-3 md:w-auto` mengembalikannya ke sebelah judul persis seperti
   * semula -- tampilan desktop tak berubah sedikit pun.
   *
   * Judulnya `line-clamp-3` di ponsel, bukan `truncate`: nama OPD panjang
   * ("Dinas Pendidikan dan Kebudayaan") lebih terbaca dalam beberapa baris
   * daripada dipotong di tengah kata pada baris pertama. Batas tiga baris
   * TIDAK membuat bilah lebih tinggi selama teksnya tak membutuhkannya --
   * terukur: 113px pada semua ukuran uji, dan hanya naik ke ~133px pada layar
   * 320px yang isinya nama OPD sepanjang 31 huruf. Sisa yang jujur: pada
   * 320px, nama OPD yang lebih panjang lagi tetap berakhir dengan elipsis;
   * teks lengkapnya ada di atribut `title`.
   *
   * AMBANG SATU BARIS DINAIKKAN `md` -> `xl` (2 September 2026).
   * Ditemukan saat memeriksa navbar admin-kab: perbaikan di ponsel dulu tak
   * menyentuh rentang TABLET, dan di situ bilah ini jauh lebih rusak daripada
   * saudaranya. `md` (768px) juga titik munculnya sidebar 256px, jadi isinya
   * dipaksa satu baris di dalam 464px. Terukur SEBELUM perbaikan:
   *   768px  dashboard -> ikon akun 170px DI LUAR tepi header, nama OPD 0px;
   *   900px  dashboard -> ikon akun 38px di luar tepi, nama OPD 0px;
   *   1024px surveys   -> nama OPD terpotong elipsis;
   *   1280px dashboard -> nama OPD terpotong elipsis.
   * Di bawah `xl` bilah ini kini memakai pola ponsel: penyaring triwulan turun
   * ke barisnya sendiri dan teks identitas disembunyikan sampai `lg`.
   */
  return (
    <header
      ref={headerRef}
      className={`fixed top-0 right-0 left-0 ${isDesktopSidebarCollapsed ? 'md:left-20' : 'md:left-64'} min-h-[64px] md:min-h-[80px] bg-surface border-b border-outline-variant flex flex-wrap xl:flex-nowrap items-center px-4 py-2 xl:px-lg xl:py-0 z-40 transition-all duration-300 gap-x-2 gap-y-2 xl:gap-lg`}
    >
      <button
        className="md:hidden -ml-1 p-2 text-on-surface hover:bg-surface-container rounded-lg shrink-0"
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        aria-label="Buka menu navigasi"
      >
        <Menu size={24} />
      </button>

      {isLoading ? (
        <span className="h-5 w-40 rounded bg-surface-container animate-pulse" />
      ) : (
        /* `flex-1 md:flex-initial` bukan sekadar hiasan -- ini yang menahan
           bilah tetap DUA baris. Dengan `flex-wrap`, peramban lebih memilih
           MEMBUNGKUS daripada memampatkan: selama lebar dasar judul masih
           `max-content` (~145px), hamburger + judul + lonceng/avatar tak muat
           di 320px, jadi kelompok lonceng terlempar ke barisnya sendiri dan
           bilahnya jadi TIGA baris setinggi 181px -- lebih tak tertata dari
           sebelumnya. `flex-1` menjadikan lebar dasarnya 0, sehingga judul tak
           pernah lagi menjadi sebab pembungkusan dan hanya mengisi sisa ruang
           baris pertama. Di md+ dikembalikan ke `flex-initial` (perilaku semula
           persis: selebar isinya, boleh menyusut) supaya penyaring triwulan
           tetap duduk rapat di sebelah judul, bukan terdorong ke ujung kanan. */
        /* Di xl+ `line-clamp-2`, BUKAN `truncate`. Di 1280px -- lebar laptop
           paling umum -- baris tunggalnya cuma menyisakan 318px untuk nama OPD
           yang butuh 362px, jadi `truncate` membuat "Dinas Pendidikan dan
           Kebudayaan" berakhir elipsis di layar seluas itu. Dua baris memuat
           nama itu utuh TANPA menambah tinggi bilah: dua baris teks 24px
           `leading-tight` = ~60px, masih di dalam `min-h-[80px]`. */
        <span
          className="min-w-0 flex-1 xl:flex-initial font-headline-md text-base md:text-headline-md font-extrabold leading-tight text-primary line-clamp-3 xl:line-clamp-2"
          title={opd?.name ? `${opd.name}${opd.code ? ` (${opd.code})` : ''}` : titleText}
        >
          {titleText}
        </span>
      )}

      {showPeriodeFilter && (
        <>
          <div className="hidden xl:block h-8 w-[1px] bg-outline-variant shrink-0 xl:order-3"></div>
          <div className="order-last flex w-full items-center gap-2 xl:order-3 xl:w-auto xl:shrink-0">
            <CalendarRange size={18} className="hidden md:block text-secondary shrink-0" />
            <Dropdown
              id="filter-periode"
              options={PERIODE_OPTIONS}
              value={periode}
              onChange={setPeriode}
              variant="primary"
              className="w-full xl:w-auto"
            />
          </div>
        </>
      )}

      {/* Teks identitas disembunyikan sampai `lg`, dulu `sm` (640px): di
          768-1023 sidebar sudah memakan 256px, dan nama + peran (maks 180px)
          plus pemisahnya adalah 204px yang membuat nama OPD menyusut ke 0px dan
          mendorong ikon akun keluar tepi. Nama pengguna tetap terbaca di dalam
          menu akun. Ambang `lg` di sini sengaja beda dari ambang satu-baris
          `xl`: teks ini cuma perlu ruang mendatar, penyaring perlu satu baris
          penuh. Sama dengan AdminKabNavbar. */}
      <div className="ml-auto flex items-center gap-2 xl:order-4 xl:gap-lg shrink-0">
        <div className="flex gap-1 md:gap-md">
          <NotificationDropdown allHref="/admin-opd/notifications" />
        </div>

        <div className="flex items-center gap-2 lg:gap-md lg:border-l border-outline-variant lg:pl-lg">
          {isLoading ? (
            <>
              <div className="text-right hidden lg:block space-y-1">
                <div className="h-4 w-28 rounded bg-surface-container animate-pulse" />
                <div className="h-3 w-16 rounded bg-surface-container animate-pulse ml-auto" />
              </div>
              <div className="w-10 h-10 rounded-full bg-surface-container animate-pulse" />
            </>
          ) : gagalIdentitas ? (
            /* MENU AKUN TETAP DIRENDER SAAT IDENTITAS GAGAL DIMUAT.
               Sejak "Keluar" pindah dari sidebar ke sini (1 September 2026),
               menampilkannya HANYA pada cabang sukses berarti pengguna yang
               profilnya gagal dimuat -- justru keadaan paling mungkin ia ingin
               keluar, misalnya sesi kedaluwarsa -- tak punya jalan keluar sama
               sekali. Sebelum pemindahan, tombol sidebar masih menyelamatkan
               keadaan ini; sesudahnya tidak, jadi celah itu ditutup di sini.
               `user` sengaja tak diteruskan: datanya memang tak ada, dan
               AdminAccountMenu sudah menanganinya ("Pengguna" / "-"). */
            <>
              <ProfileLoadError
                reason={alasanGagal}
                onRetry={refetch}
                textClassName="hidden lg:block"
              />
              <AdminAccountMenu />
            </>
          ) : (
            <>
              <div className="text-right hidden lg:block">
                <p className="text-label-md font-bold text-primary truncate max-w-[180px]">
                  {user?.name ?? 'Pengguna'}
                </p>
                <p className="text-xs text-secondary">{user?.roleLabel ?? '-'}</p>
              </div>
              {/* Sejak 1 September 2026 ikon ini menampung "Ganti Peran" &
                  "Keluar" -- lihat AdminAccountMenu. Di sidebar, kedua tombol
                  itu bisa terdorong keluar layar pada ponsel bertinggi pendek. */}
              <AdminAccountMenu user={user} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
