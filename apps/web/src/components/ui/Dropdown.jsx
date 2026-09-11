'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import useKeepInViewport from '@/hooks/useKeepInViewport';

export default function Dropdown({
  label,
  id,
  options = [],
  value,
  onChange,
  variant = 'default',
  size = 'md',
  className = '',
  error,
  /**
   * Medan cari di dalam panel, MATI secara bawaan (11 September 2026).
   *
   * Bawaannya sengaja mati, bukan hidup: Dropdown dipakai puluhan tempat dan
   * hampir semuanya berisi segelintir pilihan, yang justru terganggu oleh
   * medan cari. Yang menyalakannya adalah daftar panjang -- daftar OPD berisi
   * 62 instansi aktif dengan nama sepanjang 97 karakter.
   *
   * Penyaringannya di sisi peramban, atas seluruh `options` yang sudah ada:
   * pemanggilnya (`getOpdList({ limit: 100 })`) memang sudah mengambil semua
   * barisnya sekaligus, jadi tak ada yang tertinggal di server untuk dicari.
   */
  searchable = false,
  searchPlaceholder = 'Cari...',
  emptySearchLabel = 'Tidak ada pilihan yang cocok',
  /**
   * Nama aksesibilitas medan cari. Bawaannya diturunkan dari `label`, tetapi
   * beberapa pemakai memang TIDAK punya label tampak -- penyaring di halaman
   * Admin Kabupaten, misalnya, yang dikenali dari pilihan aktifnya sendiri.
   * Di sana bawaan "Cari pilihan" tak membedakan tiga dropdown bersebelahan.
   */
  searchAriaLabel,
  // Tinggi maksimum daftar pilihan (kelas Tailwind). Daftar SELALU bisa
  // di-scroll (`overflow-y-auto` di bawah) -- prop ini hanya memperpendeknya
  // untuk pemakaian di ruang sempit, mis. di dalam modal yang punya tombol
  // aksi di bawahnya supaya daftar tak menimpa tombol itu (lihat
  // SurveyFormModal.jsx). Default sama seperti sebelumnya.
  menuMaxHeight = 'max-h-60',
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Kata pencarian DIKOSONGKAN setiap panel ditutup, lewat `tutupPanel()` di
  // bawah. Panel yang dibuka kembali dalam keadaan tersaring terlihat seperti
  // daftar yang kehilangan isinya -- tak ada petunjuk bahwa yang
  // menyembunyikannya adalah kata yang diketik beberapa saat sebelumnya.
  const [kataCari, setKataCari] = useState('');

  // Panel ini selebar pemicunya (`w-full left-0`), jadi sumbu horizontalnya
  // aman -- yang berisiko adalah sumbu VERTIKAL. `menuMaxHeight` bernilai
  // TETAP (mis. 240px), sementara lanskap ponsel hanya setinggi ~390px: menu
  // yang terbuka dari pemicu di tengah halaman akan melewati bawah layar dan
  // pilihan terakhirnya tak bisa ditekan. Kait ini membatasi tingginya pada
  // ruang yang benar-benar tersedia. Dipasang di sini, bukan di tiap pemakai,
  // karena Dropdown adalah komponen bersama yang dipakai di seluruh aplikasi.
  const panelRef = useRef(null);
  useKeepInViewport(panelRef, isOpen);

  const tutupPanel = () => {
    setIsOpen(false);
    setKataCari('');
  };

  // Menutup dropdown jika user mengklik area luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
        setKataCari('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Label pemicu dibaca dari `options` yang UTUH, bukan dari daftar tersaring:
  // pilihan yang sedang aktif harus tetap terbaca di pemicu walau kata
  // pencarian kebetulan tak mencocokinya.
  const selectedOption = options.find(opt => opt.value === value) || options[0];

  const kataBersih = kataCari.trim().toLowerCase();
  const opsiTampil =
    searchable && kataBersih
      ? options.filter((opt) => String(opt.label ?? '').toLowerCase().includes(kataBersih))
      : options;

  const getVariantStyles = () => {
    if (error) {
      return {
        button: "bg-red-50 border border-red-300 text-red-700 hover:bg-red-100",
        icon: "text-red-500 group-hover:text-red-700",
      };
    }
    if (variant === 'primary') {
      return {
        button: "bg-blue-50 border border-blue-100 text-blue-700 hover:bg-blue-100",
        icon: "text-blue-500 group-hover:text-blue-700",
      };
    }
    return {
      button: "bg-surface border border-border text-text-primary hover:bg-surface-container",
      icon: "text-text-secondary group-hover:text-primary",
    };
  };

  const styles = getVariantStyles();

  return (
    <div className={`relative group space-y-1 ${className}`} ref={dropdownRef}>
      {label && (
        <label htmlFor={id} className={`block text-sm font-bold ${error ? 'text-red-600' : 'text-text-primary'}`}>
          {label}
        </label>
      )}
      <button 
        type="button"
        id={id}
        onClick={() => (isOpen ? tutupPanel() : setIsOpen(true))}
        className={`w-full flex items-center justify-between transition-all focus:outline-none focus:ring-2 ${error ? 'focus:ring-red-500' : 'focus:ring-primary'} shadow-sm ${styles.button} ${
          size === 'sm' 
            ? 'gap-1 px-3 py-1 min-h-[32px] rounded-lg font-label-md text-xs min-w-[120px]' 
            : 'gap-1 sm:gap-3 min-w-0 md:min-w-[140px] min-h-[44px] p-2 md:p-md rounded-lg font-medium text-xs sm:text-body-md'
        }`}
      >
        <span className="truncate">{selectedOption?.label || 'Pilih...'}</span>
        <ChevronDown 
          size={20} 
          className={`flex-shrink-0 transition-all duration-300 ${isOpen ? 'rotate-180' : ''} ${styles.icon}`} 
        />
      </button>

      {error && (
        <p className="text-sm text-red-500 mt-1.5 flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {error}
        </p>
      )}

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 mt-2 w-full max-w-[calc(100vw-1.5rem)] bg-white rounded-xl shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden z-[100] animate-in fade-in zoom-in-95 duration-200"
        >
          {searchable && (
            /* `sticky`, sebab yang menggulir bisa DUA lapis: `ul` di bawah
               punya gulirnya sendiri, dan useKeepInViewport dapat memasang
               gulir pada panel ini juga saat ruang layar sempit. Tanpa sticky,
               medan carinya ikut tergulir hilang persis pada layar yang paling
               membutuhkannya. */
            <div className="sticky top-0 z-10 bg-white p-2 border-b border-slate-100">
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary pointer-events-none"
                  aria-hidden="true"
                />
                {/* TIDAK difokuskan otomatis saat panel dibuka. Di ponsel,
                    fokus otomatis memunculkan papan ketik yang langsung
                    menutupi daftar yang baru saja dibuka -- padahal menggulir
                    daftar tetap cara terwajar bagi pengguna yang belum tahu
                    nama persis instansinya. */}
                <input
                  type="text"
                  value={kataCari}
                  onChange={(e) => setKataCari(e.target.value)}
                  placeholder={searchPlaceholder}
                  aria-label={searchAriaLabel ?? (label ? `Cari ${label}` : 'Cari pilihan')}
                  // 44px, sama seperti pemicu dropdown di atasnya. Diukur
                  // lebih dulu pada 40px: medannya memang bukan target sentuh
                  // sekecil kotak centang yang dibantu labelnya, melainkan
                  // berdiri sendiri.
                  className="w-full min-h-[44px] pl-9 pr-3 py-2 rounded-lg border border-border bg-surface text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>
          )}

          {searchable && opsiTampil.length === 0 && (
            <p className="px-4 py-6 text-sm text-center text-text-secondary">{emptySearchLabel}</p>
          )}

          <ul className={`py-1 overflow-y-auto ${menuMaxHeight}`}>
            {opsiTampil.map((option) => (
              <li key={option.value}>
                <button
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    tutupPanel();
                  }}
                  className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors
                    ${option.value === value 
                      ? 'bg-blue-50/50 text-blue-700 font-bold' 
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }
                  `}
                >
                  <span className="truncate">{option.label}</span>
                  {option.value === value && <Check size={14} className="text-blue-600 flex-shrink-0 ml-2" />}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
