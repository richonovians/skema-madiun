'use client';

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

/**
 * Dialog konfirmasi serbaguna -- pengganti `window.confirm` (dialog bawaan
 * browser tak bisa digaya, tak seragam antar-sistem operasi, dan memblokir
 * thread). Gaya visualnya mengikuti ExitConfirmationModal.jsx yang sudah ada
 * (bulatan ikon + judul + keterangan + tombol), tapi teks & warnanya
 * ditentukan pemanggil sehingga bisa dipakai lintas fitur -- beda dari
 * ConfirmStatusModal.jsx yang teksnya terkunci untuk status pengaduan.
 *
 * `icon` HARUS elemen JSX yang sudah dirender (mis. `<Trash2 size={32} />`),
 * BUKAN referensi komponen (`Trash2`) -- sama seperti EmptyState.jsx, lihat
 * catatan bug di sana.
 *
 * @param {'danger'|'primary'} tone Warna aksen + tombol konfirmasi.
 */
export default function ConfirmDialog({
  isOpen,
  title,
  description,
  confirmLabel = 'Ya, Lanjutkan',
  cancelLabel = 'Batal',
  tone = 'danger',
  icon,
  isProcessing = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen && !isProcessing) onCancel?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, isProcessing, onCancel]);

  // Kunci scroll halaman di belakang dialog selagi terbuka. Pola inline lama
  // dipindah ke hooks/useBodyScrollLock.js (2026-08-24) -- ia sudah tersalin
  // identik di empat berkas, dan penghitungnya kini menangani lapisan bertumpuk.
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const isDanger = tone === 'danger';

  // DIGAMBAR DI `document.body`, BUKAN DI TEMPAT KOMPONEN INI DIPANGGIL
  // (4 Oktober 2026, laporan pengguna: "tombol perkecil sidebar muncul
  // sendiri" saat modal builder terbuka).
  //
  // `z-[9999]` di bawah ini TIDAK berarti apa-apa terhadap dunia luar selama
  // modalnya digambar di dalam leluhur yang punya konteks penumpukan sendiri.
  // BuilderLayout berkelas `relative z-50`, jadi seluruh builder beserta
  // modalnya adalah SATU lapisan setinggi 50 -- dan tombol ciutkan sidebar
  // (`fixed z-[60]`, saudara di luar builder) digambar di atas latar gelapnya.
  // Yang terlihat pengguna: segalanya meredup kecuali satu tombol yang
  // tertinggal tajam, seolah ia baru saja muncul.
  //
  // Portal memutus ketergantungan itu untuk SETIAP tempat pemanggilan,
  // sekarang dan nanti -- sama seperti RoleLoginPicker, meski sebabnya di sana
  // leluhur ber-transform, bukan z-index.
  //
  // `document` diperiksa karena berkas ini ikut terangkut ke bundel server.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && !isProcessing && onCancel?.()}
    >
      {/* `role="dialog"` + `aria-modal` (4 Oktober 2026). Sebelumnya dialog ini
          hanya sepasang <div>: terlihat sebagai modal, tetapi bagi pembaca layar
          ia cuma teks yang muncul entah dari mana, tanpa tanda bahwa isi di
          belakangnya sedang tak dapat dipakai. `aria-labelledby` menunjuk ke
          judulnya supaya dialognya terbaca bernama, bukan "dialog" kosong. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-konfirmasi"
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-[420px]"
      >
        <div className="p-6 text-center space-y-3">
          <div
            className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-2 ${
              isDanger ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-primary'
            }`}
          >
            {icon ?? <AlertTriangle size={32} />}
          </div>

          <h3 id="judul-konfirmasi" className="text-xl font-bold text-text-primary">
            {title}
          </h3>
          <p className="text-sm text-text-secondary leading-relaxed">{description}</p>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold text-sm hover:bg-slate-100 transition-all disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] shadow-md disabled:opacity-60 ${
              isDanger
                ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                : 'bg-primary hover:bg-primary-hover shadow-primary/20'
            }`}
          >
            {isProcessing ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
