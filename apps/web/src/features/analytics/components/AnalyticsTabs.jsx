'use client';
import React from 'react';

/**
 * Baris ini SEBELUMNYA satu flex tanpa `flex-wrap` dan tanpa `min-w-0`
 * (31 Agustus 2026), sehingga tak ada satu pun bagiannya yang boleh menyusut:
 * item flex bawaannya `min-width: auto`, yang berarti "jangan pernah lebih
 * sempit dari isimu". Lebar intrinsiknya jadi 1226px -- padahal `Dropdown`
 * sendiri sudah menyiapkan `truncate` + `min-w-0`, yang tak pernah terpakai
 * karena rantai leluhurnya tak mengizinkannya menyusut.
 *
 * Akibatnya /admin-opd/analytics jadi satu-satunya halaman yang memaksa
 * viewport tata letak melebar: pada perangkat 390px `innerWidth` terbaca 825,
 * jadi peramban mengecilkan SELURUH halaman agar pas -- di ponsel terlihat
 * sebagai "tulisannya kecil semua", bukan sebagai bilah gulir. Di 768/844/1024
 * ia muncul sebagai gulir samping 458/382/202px.
 *
 * Tiga perubahan, masing-masing menangani satu penyebab:
 *  - `flex-wrap` + `gap-y-2`: pada layar sempit pemilih survei turun ke barisnya
 *    sendiri alih-alih mendesak deretan tab;
 *  - `min-w-0` pada kedua sisi: mengizinkan penyusutan, sehingga `truncate` di
 *    dalam Dropdown akhirnya bekerja;
 *  - `overflow-x-auto` pada deretan tab: kalau tetap tak cukup, yang digulir
 *    hanya deretan tab itu, bukan seluruh halaman.
 */
export default function AnalyticsTabs({ tabs, activeTab, onChange, rightSlot }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-y-2 border-b border-outline-variant sticky top-0 bg-background pt-sm z-30 mb-lg">
      <div className="flex min-w-0 overflow-x-auto hide-scrollbar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 whitespace-nowrap px-lg md:px-xl py-md text-label-md transition-all hover:bg-surface-container-low border-b-[3px]
              ${activeTab === tab.id
                ? 'border-primary text-primary font-bold'
                : 'border-transparent text-secondary'}
            `}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {rightSlot && (
        <div className="pb-2 flex items-center min-w-0 w-full sm:w-auto">
          {rightSlot}
        </div>
      )}
    </div>
  );
}
