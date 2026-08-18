'use client';
import React, { useEffect } from 'react';
import { AlertTriangle, ShieldAlert, X } from 'lucide-react';

/**
 * Modal konfirmasi aksi umum (bukan spesifik status pengaduan).
 *
 * Props:
 *  - isOpen: boolean
 *  - title: string         — judul modal
 *  - description: string   — deskripsi/peringatan
 *  - confirmLabel: string  — teks tombol konfirmasi (default: "Ya, Lanjutkan")
 *  - danger: boolean       — mode merah untuk aksi destruktif (default: false)
 *  - onConfirm(): void
 *  - onCancel(): void
 */
export default function ConfirmActionModal({
  isOpen,
  title,
  description,
  confirmLabel = 'Ya, Lanjutkan',
  danger = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) onCancel?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  const headerBg = danger ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100';
  const iconBg = danger ? 'bg-red-100' : 'bg-amber-100';
  const IconComponent = danger ? ShieldAlert : AlertTriangle;
  const iconColor = danger ? 'text-red-600' : 'text-amber-600';
  const confirmBtnClass = danger
    ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
    : 'bg-primary hover:bg-primary-hover shadow-primary/20';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onCancel?.()}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ width: '100%', maxWidth: '420px', margin: '0 16px' }}
      >
        {/* Header */}
        <div className={`px-6 pt-6 pb-4 ${headerBg} border-b relative`}>
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
              <IconComponent size={20} className={iconColor} />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Konfirmasi Aksi
              </p>
              <h3 className="font-bold text-slate-800 text-base leading-tight">{title}</h3>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-slate-600 leading-relaxed">{description}</p>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2 sm:gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] shadow-md ${confirmBtnClass}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
