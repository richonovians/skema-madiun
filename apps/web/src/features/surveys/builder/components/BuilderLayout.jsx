import React from 'react';
import BuilderSidebar from './BuilderSidebar';

/**
 * Toolbar TIDAK dirender di sini lagi -- sebelumnya BuilderLayout merender
 * <BuilderToolbar/> internal TANPA prop (versi lama, tak terhubung ke state
 * apa pun), sementara pemanggil (page.jsx, INT-19) JUGA merender toolbar
 * yang sudah di-wiring sebagai children -- hasilnya 2 toolbar tumpang tindih
 * di DOM (ketahuan lewat verifikasi Playwright: "resolved to 2 elements").
 * Sekarang caller yang bertanggung jawab penuh menaruh toolbar sbg children.
 *
 * Prop seret-lepas hanya diteruskan ke BuilderSidebar: state dragnya dipegang
 * SurveyBuilderScreen (induk bersama bilah sisi & kanvas) supaya kanvas tahu
 * tipe apa yang sedang diseret tanpa mengandalkan dataTransfer, yang di
 * peristiwa `dragover` tidak boleh dibaca oleh browser.
 *
 * LAYAR-PENUH HANYA MULAI `md` (16 September 2026, laporan pengguna: builder
 * "menampilkan 2 layar atas dan bawah"). Mengunci tinggi builder ke layar lalu
 * menyusunnya sebagai kolom membelah ponsel jadi dua daerah gulir mandiri --
 * terukur pada layar 800px: palet 304px, kanvas 432px, bilah atas 64px, habis
 * terbagi. Di bawah `md` seluruh builder kini menggulir sebagai satu halaman;
 * susunan dua kolom di atasnya tak berubah sama sekali.
 */
export default function BuilderLayout({
  children,
  onAddBaku,
  onAddCustom,
  onDragTypeStart,
  onDragEnd,
  canDrag,
  alasanTerkunci,
}) {
  /*
   * TEPI KIRINYA MENGIKUTI SIDEBAR (30 September 2026, laporan pengguna).
   * Dulu `md:left-64` ditulis mati, sehingga saat sidebar diciutkan ke
   * `md:w-20` builder tetap mulai di 256px sementara sidebarnya 80px --
   * 176px ruang kosong di kiri, dan kanvas menyempit sebanyak itu.
   *
   * Lewat variabel CSS, BUKAN context: builder dipakai dua area dengan dua
   * provider berbeda, dan `useAdminLayout()` MELEMPAR di luar provider-nya,
   * jadi memanggil salah satunya akan mematikan area yang lain. Penyetelnya
   * AdminSidebar & AdminKabSidebar, mengikuti pola `--tinggi-navbar-kab`.
   *
   * Nilai cadangan 16rem menjaga berkas ini tetap benar ketika dirender tanpa
   * sidebar mana pun -- yang persis dilakukan BuilderSatuLayar.test.jsx.
   */
  return (
    <div className="relative z-50 flex flex-col bg-background md:fixed md:inset-0 md:left-[var(--lebar-sidebar,16rem)] md:overflow-hidden">
      {/* TANPA `pt` di bawah `md`. Ruang untuk bilah atas hanya perlu disediakan
          sendiri ketika builder menjadi lapisan `fixed` yang menutup seluruh
          layar. Di bawah `md` ia kembali menjadi halaman biasa di dalam
          AdminLayout, yang <main>-nya sudah menyisakan 80px untuk navbar
          tetapnya -- lebih tinggi dari bilah atas builder yang 64px. Menambah
          `pt-16` di sana menumpuk dua sisa ruang dan meninggalkan pita kosong
          80px di bawah bilah atas. */}
      <div
        data-baris-builder
        className="flex flex-1 flex-col md:h-full md:flex-row md:overflow-hidden md:pt-[80px]"
      >
        <BuilderSidebar
          onAddBaku={onAddBaku}
          onAddCustom={onAddCustom}
          onDragTypeStart={onDragTypeStart}
          onDragEnd={onDragEnd}
          canDrag={canDrag}
          alasanTerkunci={alasanTerkunci}
        />
        <div data-wadah-kanvas className="w-full md:flex-1 md:overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
}
