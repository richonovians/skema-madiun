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
  return (
    <div className="relative z-50 flex flex-col bg-background md:fixed md:inset-0 md:left-64 md:overflow-hidden">
      {/* TANPA `pt` di bawah `md`. Ruang untuk bilah atas hanya perlu disediakan
          sendiri ketika builder menjadi lapisan `fixed` yang menutup seluruh
          layar. Di bawah `md` ia kembali menjadi halaman biasa di dalam
          AdminLayout, yang <main>-nya sudah menyisakan 80px untuk navbar
          tetapnya -- lebih tinggi dari bilah atas builder yang 64px. Menambah
          `pt-16` di sana menumpuk dua sisa ruang dan meninggalkan pita kosong
          80px di bawah bilah atas. */}
      <div
        data-baris-builder
        className="flex flex-1 flex-col md:h-full md:flex-row md:overflow-hidden md:pt-[72px]"
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
