'use client';
import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, AlertTriangle, CheckCircle2, XCircle, Clock, X, ShieldAlert } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

const STATUS_CONFIG = {
  Diterima: {
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    dot: 'bg-blue-500',
    icon: Clock,
  },
  Diproses: {
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    icon: Clock,
  },
  Selesai: {
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    icon: CheckCircle2,
  },
  Ditolak: {
    color: 'bg-red-100 text-red-700 border-red-200',
    dot: 'bg-red-500',
    icon: XCircle,
  },
};

function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] ?? {
    color: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-400',
    icon: Clock,
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border ${cfg.color}`}
    >
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      {status}
    </span>
  );
}

/**
 * Modal konfirmasi perubahan status pengaduan.
 *
 * Props:
 *  - isOpen: boolean
 *  - fromStatus: string  — status sekarang
 *  - toStatus: string    — status tujuan
 *  - requireReason: boolean — tampilkan field alasan (wajib untuk "Ditolak")
 *  - onConfirm(reason?: string): void
 *  - onCancel(): void
 */
export default function ConfirmStatusModal({
  isOpen,
  fromStatus,
  toStatus,
  requireReason = false,
  onConfirm,
  onCancel,
}) {
  const [reason, setReason] = useState('');
  const [shake, setShake] = useState(false);
  const textareaRef = useRef(null);

  // Reset state setiap kali modal dibuka
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setShake(false);
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [isOpen]);

  // Tutup saat tekan Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) onCancel?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onCancel]);

  // Komponen ini tetap ter-mount saat tertutup (induknya merender
  // `<ConfirmStatusModal isOpen={...}/>` terus-menerus), jadi penguncinya
  // dikendalikan `isOpen` -- bukan dipanggil tanpa syarat.
  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  const isDangerous = toStatus === 'Ditolak';

  const handleConfirm = () => {
    if (requireReason && !reason.trim()) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      textareaRef.current?.focus();
      return;
    }
    onConfirm(requireReason ? reason.trim() : undefined);
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onCancel?.()}
    >
      {/* `width:100%` + `margin: 0 16px` (gaya inline sebelumnya) menempati
          100% + 32px pada flex item -- di layar lebih sempit dari maxWidth (yaitu
          hampir semua ponsel) sisi kanan modal terpotong. Jarak tepi kini dari
          `p-4` induk, sehingga `w-full` benar-benar pas di dalamnya. */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-[440px]">
        {/* Header berwarna sesuai jenis aksi */}
        <div
          className={`px-6 pt-6 pb-4 ${isDangerous ? 'bg-red-50' : 'bg-amber-50'} border-b ${isDangerous ? 'border-red-100' : 'border-amber-100'} relative`}
        >
          <button
            onClick={onCancel}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3 mb-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDangerous ? 'bg-red-100' : 'bg-amber-100'}`}
            >
              {isDangerous ? (
                <ShieldAlert size={20} className="text-red-600" />
              ) : (
                <AlertTriangle size={20} className="text-amber-600" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Konfirmasi Perubahan
              </p>
              <h3 className="font-bold text-slate-800 text-base leading-tight">
                Ubah Status Pengaduan
              </h3>
            </div>
          </div>

          {/* Visualisasi status lama → baru */}
          <div className="flex items-center gap-2 flex-wrap">
            <StatusBadge status={fromStatus} />
            <ArrowRight size={16} className="text-slate-400 flex-shrink-0" />
            <StatusBadge status={toStatus} />
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-slate-600 leading-relaxed">
            Anda akan mengubah status tiket ini dari{' '}
            <span className="font-semibold text-slate-800">{fromStatus}</span> menjadi{' '}
            <span className="font-semibold text-slate-800">{toStatus}</span>.{' '}
            {isDangerous
              ? 'Tindakan ini akan memberitahu pelapor bahwa pengaduannya ditolak.'
              : 'Pelapor akan mendapat notifikasi atas perubahan status ini.'}
          </p>

          {requireReason && (
            <div className={`transition-all ${shake ? 'animate-shake' : ''}`}>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Alasan Penolakan <span className="text-red-500">*</span>
              </label>
              <textarea
                ref={textareaRef}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Tuliskan alasan penolakan pengaduan ini secara jelas..."
                rows={3}
                className={`w-full text-sm px-3.5 py-2.5 rounded-xl border bg-slate-50 focus:bg-white text-slate-800 placeholder-slate-400 outline-none transition-all resize-none
                  ${!reason.trim() && shake
                    ? 'border-red-400 ring-2 ring-red-200 focus:border-red-400 focus:ring-red-200'
                    : 'border-slate-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-100'
                  }`}
              />
              {!reason.trim() && shake && (
                <p className="text-xs text-red-500 mt-1 font-medium">Alasan penolakan wajib diisi.</p>
              )}
            </div>
          )}

          {!requireReason && (
            <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <CheckCircle2 size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                Perubahan status tidak dapat dibatalkan setelah dikonfirmasi. Pastikan Anda sudah
                yakin sebelum melanjutkan.
              </p>
            </div>
          )}
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
            onClick={handleConfirm}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] shadow-md
              ${isDangerous
                ? 'bg-red-600 hover:bg-red-700 shadow-red-200'
                : 'bg-primary hover:bg-primary-hover shadow-primary/20'
              }`}
          >
            {isDangerous ? 'Ya, Tolak Pengaduan' : `Ya, Ubah ke "${toStatus}"`}
          </button>
        </div>
      </div>

    </div>
  );
}
