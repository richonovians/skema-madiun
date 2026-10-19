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
 *
 * OFFSET STICKY DIKIRIM PEMANGGIL (7 Oktober 2026, laporan pengguna beserta
 * tangkapan layar). `top-0` menempel pada tepi atas VIEWPORT, dan navbar kedua
 * area admin `fixed` di tepi itu juga -- begitu halaman digulir, bilah ini
 * meluncur ke BELAKANG navbar dan tab maupun pemilih survei tertutup separuh.
 *
 * Nilainya tak dapat dipaku di sini: komponen ini dipakai dua area dengan dua
 * navbar yang tingginya berbeda dan dilaporkan ke dua variabel CSS berlainan
 * (`--tinggi-navbar-kab`, `--tinggi-navbar-opd`). Memilih salah satunya berarti
 * area yang lain pasti salah. Bakunya tetap `top-0` supaya pemakai lain --
 * bila kelak ada, di halaman tanpa navbar tetap -- tak ikut berubah.
 *
 * `z-20`, TURUN DARI z-30 (7 Oktober 2026). Navbar kedua area juga z-30, dan
 * pada z yang sama yang menang adalah yang belakangan di urutan DOM -- selalu
 * bilah ini. Akibatnya ia MENUTUPI navbar setiap kali keduanya bertindihan.
 * Yang diturunkan bilah ini, bukan dinaikkan navbarnya: z-30 navbar sudah
 * berpasangan dengan laci sidebar (z-50) dan latarnya (z-40).
 *
 * YANG MASIH HARUS DIKETAHUI: `sticky` di sini TIDAK AKTIF pada kedua halaman
 * analytics. Terukur di /admin-kab/analytics -- `top` ter-resolve 80px, tetapi
 * saat `scrollY` 74 bilahnya berada di 30, bukan berhenti di 80. Sebabnya akar
 * `AdminKabLayout` memakai `overflow-hidden`, dan ancestor ber-overflow bukan
 * `visible` merebut peran scroll container sehingga sticky tak pernah terpicu.
 * Jadi bilah ini sesungguhnya ikut tergulir seperti isi biasa. Membuang
 * `overflow-hidden` itu belum dikerjakan: ia menahan gulir mendatar saat
 * sidebar beranimasi, dan membuangnya butuh pengukurannya sendiri.
 */
export default function AnalyticsTabs({ tabs, activeTab, onChange, rightSlot, kelasSticky = 'top-0' }) {
  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-y-2 border-b border-outline-variant sticky ${kelasSticky} bg-background pt-sm z-20 mb-lg`}
    >
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
