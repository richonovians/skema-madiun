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
 */
export default function BuilderLayout({
  children,
  onAddBaku,
  onAddCustom,
  onDragTypeStart,
  onDragEnd,
  canDrag,
}) {
  return (
    <div className="fixed inset-0 md:left-64 z-50 flex flex-col bg-background overflow-hidden">
      <div className="flex flex-col md:flex-row flex-1 pt-16 md:pt-[72px] h-full overflow-hidden">
        <BuilderSidebar
          onAddBaku={onAddBaku}
          onAddCustom={onAddCustom}
          onDragTypeStart={onDragTypeStart}
          onDragEnd={onDragEnd}
          canDrag={canDrag}
        />
        <div className="flex-1 overflow-y-auto w-full">{children}</div>
      </div>
    </div>
  );
}
