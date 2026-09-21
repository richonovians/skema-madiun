'use client';
import React, { useCallback, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, CalendarRange } from 'lucide-react';
import Dropdown from '@/components/ui/Dropdown';
import NotificationDropdown from '@/components/ui/NotificationDropdown';
import AdminAccountMenu from './AdminAccountMenu';
// ProfileErrorAvatar tak lagi diimpor langsung: jalur ponsel yang dulu
// memakainya sendiri sudah menyatu dengan jalur desktop, dan ProfileLoadError
// sudah membawa avatar galat itu di dalamnya.
import ProfileLoadError from '@/components/ui/ProfileLoadError';
import { useAdminKabLayout } from './AdminKabLayoutProvider';
import { useAsync } from '@/hooks/useAsync';
import { isUnauthorizedError } from '@/services/api';
import { getMyProfile } from '@/features/profile/services/profile.api';
import { buildRecentPeriodeOptions } from '@/features/surveys/adapters/survey.adapter';

// "Semua Periode" sengaja jadi opsi pertama DAN nilai awal -- lihat alasannya di
// AdminKabLayoutProvider.jsx (dashboard eksekutif tak boleh tampil kosong hanya
// karena triwulan berjalan belum punya survei bernilai).
const ALL_PERIODS = { value: '', label: 'Semua Periode' };
const PERIODE_OPTIONS = [ALL_PERIODS, ...buildRecentPeriodeOptions()];

// Dipetakan dari rute yang BENAR-BENAR ada (lihat app/admin-kab/* dan tautan di
// AdminKabSidebar.jsx). Judul lama mencocokkan '/management-opd' dan
// '/management-users' -- dua rute yang tak pernah ada di proyek ini, sehingga
// LIMA dari enam halaman jatuh ke judul umum "Panel Admin Kabupaten".
// Diurut dari yang paling spesifik supaya pencocokan awalan tak salah ambil.
const PAGE_TITLES = [
  ['/admin-kab/dashboard', 'Dashboard Eksekutif'],
  ['/admin-kab/opd', 'Daftar OPD'],
  ['/admin-kab/surveys', 'Monitoring Survei'],
  ['/admin-kab/complaints', 'Pengaduan'],
  ['/admin-kab/users', 'Manajemen User'],
  ['/admin-kab/audit-logs', 'Audit Logs'],
];


/**
 * Navbar Admin Kabupaten.
 *
 * SEBELUMNYA identitasnya karangan: nama "Admin Kabupaten" dan inisial "AK"
 * di-hardcode, bukan pengguna yang sedang login. Kini dari GET /auth/me
 * (inisial lewat Avatar.jsx -- backend tak punya foto profil maupun jabatan,
 * lihat catatan gap me.adapter.js).
 *
 * Kedua penyaring juga mati total: keduanya menulis `?year=` / `?service=` ke
 * URL, TAPI tak satu pun komponen membacanya (halaman dashboard sendiri sudah
 * membuang dukungan filter itu, lihat komentar di app/admin-kab/dashboard/page.jsx).
 * Nilainya pun tak mungkin cocok data nyata: tahunnya cuma 2024 & 2023
 * (keduanya sudah lampau), dan jenis layanannya huruf kecil ('kesehatan')
 * sementara backend menyimpannya kapital ('Kesehatan') dan mencocokkan persis.
 *
 * Sekarang periodenya nyata dan diteruskan ke `GET /dashboard/ikm`, dengan
 * format kanonik {tahun}-Q{1-4} -- bukan tahun saja, sebab backend mencocokkan
 * `IkmResult.periode`/`Survey.periode` PERSIS, jadi "2026" tak akan cocok apa
 * pun.
 *
 * Penyaring jenis layanan DIBUANG 15 September 2026 atas permintaan pengguna.
 * Bersamanya hilang `GET /opd` yang dipanggil hanya untuk membangun pilihannya,
 * pada SETIAP halaman Admin Kabupaten -- termasuk lima halaman yang tak pernah
 * menampilkan penyaring sama sekali.
 */
export default function AdminKabNavbar() {
  const {
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isDesktopSidebarCollapsed,
    periode,
    setPeriode,
  } = useAdminKabLayout();
  const pathname = usePathname();

  const pageTitle =
    PAGE_TITLES.find(([prefix]) => pathname?.startsWith(prefix))?.[1] ?? 'Panel Admin Kabupaten';

  // Penyaring HANYA di dashboard -- satu-satunya halaman yang membacanya.
  const isDashboard = pathname?.startsWith('/admin-kab/dashboard');

  const fetchProfile = useCallback(() => getMyProfile(), []);
  const { data: user, isLoading, error, refetch } = useAsync(fetchProfile);

  // `error` dulu tak pernah diambil, sehingga kegagalan memuat profil tampil
  // sebagai data: "Pengguna" / "-" / "?" (2026-08-28). Lihat alasan lengkap &
  // pembedaan 401-vs-jaringan di ProfileLoadError.jsx dan api.js.
  const gagalProfil = error != null;
  const alasanGagal = isUnauthorizedError(error) ? 'expired' : 'offline';

  /**
   * Melaporkan tinggi nyata bilah ini ke `--tinggi-navbar-kab`, yang dipakai
   * `<main>` di AdminKabLayout sebagai padding-top.
   *
   * Perlu diukur, tidak boleh dipatok (31 Agustus 2026). Bilah ini `fixed`,
   * jadi keluar dari alur tata letak dan `<main>` harus menyisakan ruang
   * sendiri. Sebelumnya ruang itu berupa angka tetap `pt-[110px] md:pt-20`,
   * dan angka apa pun salah karena tingginya berubah oleh empat sebab
   * sekaligus:
   *   - `flex-col` di bawah md membungkus isinya menjadi beberapa baris;
   *   - penyaring periode hanya ada di halaman dashboard;
   *   - `hasServiceFilter` di atas baru diketahui SETELAH GET /opd selesai,
   *     jadi tingginya bahkan berubah di tengah hidup halaman;
   *   - judul halaman yang panjang ikut membungkus pada layar sempit.
   * Terukur empat tinggi berbeda -- 177, 121, 101, dan 80 px -- sementara
   * offsetnya cuma 110/80, sehingga isi halaman tertutup di 27 dari 42
   * kombinasi rute x lebar yang diuji.
   *
   * Nilai awalnya ada di globals.css (`:root`), dipakai sebelum JS jalan;
   * yang di sini menimpanya karena inline style pada elemen yang sama
   * mengalahkan aturan stylesheet.
   */
  const headerRef = useRef(null);
  useEffect(() => {
    if (!headerRef.current) return;
    
    // ResizeObserver digunakan untuk memperbarui tinggi bilah ke properti khusus
    // CSS (`--tinggi-navbar-kab`), sehingga padding-top halaman SELALU tepat
    // selebar tinggi aktual bilah ini.
    // SEBELUMNYA `AdminKabLayout` mematok padding 110px di ponsel dan 80px
    // di desktop, tapi begitu halaman tak butuh penyaring (tinggi menyusut
    // ke 64px/80px) atau layar amat sempit sehingga penyaring membungkus lagi,
    // angka tetap itu jadi keliru dan merusak tata letak.
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        document.documentElement.style.setProperty(
          '--tinggi-navbar-kab',
          `${entry.target.offsetHeight}px`
        );
      }
    });
    
    observer.observe(headerRef.current);

    return () => {
      observer.disconnect();
      // Dibersihkan saat keluar dari area admin-kab: nilainya milik bilah ini,
      // dan meninggalkannya membuat tata letak lain mewarisi angka asing.
      document.documentElement.style.removeProperty('--tinggi-navbar-kab');
    };
  }, []);

  /**
   * SATU BARIS BARU DARI `xl` (1280px), BUKAN `md` (2 September 2026).
   *
   * Sebelumnya tata letak "semua dalam satu baris" menyala di `md` (768px) --
   * padahal `md` juga titik di mana SIDEBAR muncul dan mengambil 256px. Jadi
   * tepat di 768px bilah ini cuma punya 464px ruang dalam untuk judul + dua
   * penyaring + lonceng + nama pengguna + avatar. Terukur: ikon akun terdorong
   * 55px KELUAR tepi header pada dashboard, dan judul di lima halaman lain
   * menyusut ke 134px sehingga "Manajemen OPD" pun berakhir elipsis.
   *
   * Ambangnya `xl`, bukan `lg`, karena `lg` (1024px) pun masih belum cukup:
   * di situ judul dashboard tinggal 153px dan tetap terpotong. Terukur setelah
   * perbaikan -- judul "Dashboard Eksekutif" utuh di 320, 360, 412, 768, 900,
   * 1024, 1280, dan 1440.
   *
   * Di bawah `xl` polanya sama dengan ponsel: penyaring turun ke barisnya
   * sendiri selebar bilah. Tingginya tak perlu disesuaikan tangan -- diukur
   * ResizeObserver di atas dan dilaporkan ke `--tinggi-navbar-kab`.
   */
  return (
    <header
      ref={headerRef}
      className={`fixed top-0 right-0 left-0 ${isDesktopSidebarCollapsed ? 'md:left-20' : 'md:left-64'} min-h-[64px] md:min-h-[80px] bg-surface border-b border-outline-variant flex flex-wrap xl:flex-nowrap items-center px-4 py-2 xl:px-lg xl:py-0 z-30 gap-x-2 gap-y-2 xl:gap-lg transition-all duration-300`}
    >
      <button
        className="md:hidden -ml-1 flex items-center justify-center min-w-[44px] min-h-[44px] text-on-surface hover:bg-surface-container rounded-lg shrink-0"
        onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
        aria-label="Buka menu navigasi"
      >
        <Menu size={24} />
      </button>

      {/* `flex-1` DI SEMUA LEBAR -- dan justru itulah yang menahan lonceng &
          ikon akun tetap di ujung kanan.

          Di ponsel alasannya: dengan `flex-wrap`, peramban lebih memilih
          MEMBUNGKUS daripada memampatkan, jadi selama lebar dasar judul masih
          `max-content` ia sendiri yang mendorong kelompok lonceng+akun turun ke
          baris berikutnya. Lebar dasar 0 membuat judul tak pernah lagi menjadi
          sebab pembungkusan.

          Di desktop dulu `md:flex-initial`, dan di situlah cacatnya (dilaporkan
          pengguna 2 September 2026, tangkapan layar halaman Manajemen OPD):
          judul selebar isinya, sementara satu-satunya yang menyerap ruang
          kosong adalah `md:ml-auto` pada baris PENYARING -- yang hanya ada di
          halaman dashboard. Di LIMA halaman admin-kab lainnya tak ada penyaring,
          jadi tak ada apa pun yang mendorong ke kanan dan lonceng+akun menempel
          rapat di sebelah judul dengan ruang kosong lebar di kanannya.

          `flex-1` menjadikan judul sendiri penyerap ruang kosong itu, sehingga
          lonceng & ikon akun tergeser ke kanan di SEMUA halaman -- ada penyaring
          maupun tidak. `min-w-0` + `md:truncate` menjaga judul panjang tetap
          menyusut dengan elipsis, bukan menjebol tepi. */}
      <h2 className="min-w-0 flex-1 font-headline-md text-base md:text-headline-md font-extrabold leading-tight text-primary line-clamp-2 xl:line-clamp-none xl:truncate">
        {pageTitle}
      </h2>

      {/* Penyaring: baris sendiri selebar layar di ponsel (`order-last w-full`),
          kembali ke tempat semula di md+ lewat `md:order-3 md:w-auto`.

          `md:ml-auto` DIHAPUS (2 September 2026). Ruang kosong desktop kini
          diserap judul (`flex-1`, lihat catatan di atas), jadi penyaring tetap
          berkumpul di ujung kanan bersama lonceng & akun -- tanpa lagi menjadi
          SATU-SATUNYA yang mendorong ke kanan, yang membuat lima halaman
          tanpa penyaring tertinggal rata kiri. */}
      {isDashboard && (
        <div className="order-last flex w-full items-center gap-2 pb-1 xl:order-3 xl:w-auto xl:shrink-0 xl:pb-0">
          <div className="flex-1 min-w-0 flex items-center gap-1.5">
            <CalendarRange size={18} className="hidden lg:block text-secondary shrink-0" />
            <Dropdown
              id="filter-kab-periode"
              options={PERIODE_OPTIONS}
              value={periode}
              onChange={setPeriode}
              variant="primary"
              className="w-full"
            />
          </div>
        </div>
      )}

      {/* LONCENG & IKON AKUN JADI SATU KELOMPOK (1 September 2026, permintaan
          pengguna: "tombol notifikasi di samping kiri ikon akun profil", agar
          sama dengan navbar Admin OPD).

          Sebelumnya lonceng duduk di kelompok kanan BERSAMA penyaring,
          sementara ikon akun punya salinan sendiri khusus ponsel di baris
          pertama. Karena penyaringnya `w-full`, di ponsel urutannya menjadi
          tiga baris: [judul + avatar] / [penyaring] / [lonceng sendirian] --
          lonceng terlempar ke baris ketiga, jauh dari ikon akun.

          Sekarang keduanya satu simpul yang dipakai KEDUA lebar layar, jadi
          lonceng selalu tepat di kiri ikon akun. Ini juga menghapus salinan
          menu akun versi ponsel: satu-satunya `AdminAccountMenu` yang tersisa
          berlaku di semua lebar, sehingga tak mungkin lagi dua versi itu
          berbeda perilaku. `NotificationDropdown` tetap satu instance -- dua
          instance berarti dua permintaan notifikasi tiap muat halaman.

          Yang khusus desktop kini hanya TEKS identitasnya (`hidden lg:block`)
          plus pemisah `lg:border-l`, sama seperti AdminNavbar. Ambangnya
          dinaikkan dari `md` ke `lg`: di 768-1023 sidebar sudah memakan 256px,
          dan nama pengguna (maks 180px) + pemisahnya adalah 204px yang membuat
          judul menyusut jadi elipsis serta ikon akun terdorong keluar tepi.
          Nama lengkapnya tetap bisa dilihat di dalam menu akun.
          (Ambang `lg` di sini sengaja BEDA dari ambang satu-baris `xl` di atas:
          teks identitas cuma perlu ruang mendatar di barisnya sendiri, sedangkan
          penyaring perlu seluruh baris.)

          `ml-auto` berlaku di SEMUA lebar (dulu dibatalkan `md:ml-0`) sebagai
          jaminan kedua bahwa kelompok ini rapat ke tepi kanan, bahkan bila
          judulnya kelak tak lagi `flex-1`. Polanya kini identik AdminNavbar. */}
      <div className="ml-auto flex shrink-0 items-center gap-2 xl:order-4 lg:gap-md">
        <NotificationDropdown allHref="/admin-kab/notifications" />

        <div className="flex items-center gap-2 lg:gap-md lg:border-l lg:border-border lg:pl-lg">
          {isLoading ? (
            <>
              <div className="hidden lg:block text-right space-y-1">
                <div className="h-4 w-28 rounded bg-surface-container animate-pulse" />
                <div className="h-3 w-20 rounded bg-surface-container animate-pulse ml-auto" />
              </div>
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-full bg-surface-container animate-pulse" />
            </>
          ) : gagalProfil ? (
            /* Menu akun tetap ikut dirender walau profil gagal dimuat -- sejak
               "Keluar" pindah ke ikon profil, cabang gagal yang tanpa menu
               berarti pengguna terkurung tanpa jalan keluar. Keterangan
               teksnya disembunyikan di ponsel (`textClassName`), tapi avatar
               galat berlabel milik ProfileLoadError tetap tampil sebagai
               penanda keadaan. */
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
              <div className="hidden lg:block text-right">
                <p className="text-label-md font-bold text-primary truncate max-w-[180px]">
                  {user?.name ?? 'Pengguna'}
                </p>
                <p className="text-xs text-secondary">{user?.roleLabel ?? '-'}</p>
              </div>
              <AdminAccountMenu user={user} />
            </>
          )}
        </div>
      </div>
    </header>
  );
}
