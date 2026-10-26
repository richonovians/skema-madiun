'use client';

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';

/**
 * Modal GANTI JENIS CUSTOM -> SKM (26 Oktober 2026, permintaan pengguna:
 * "tambahkan fitur ganti jenis survei untuk jenis survei custom").
 *
 * Pasangan `GantiJenisModal` (SKM -> Custom), dengan akibat yang berbeda dan
 * karena itu kalimat yang berbeda: tak ada yang dihapus. Kesembilan unsur
 * ditambahkan di depan, pertanyaan milik OPD dipertahankan di belakangnya
 * sebagai pertanyaan tambahan yang TIDAK dihitung Nilai IKM, dan tujuan +
 * metode Nilai Survei dibuang karena SKM tak memakainya. Ketiganya disebut
 * sebelum apa pun dikirim. Tak ada pilihan yang perlu diisi, jadi tombol
 * konfirmasinya langsung menyala; warnanya biru, bukan merah, sebab tak ada
 * data yang hilang dan survei masih dapat dikembalikan ke Custom selagi draf.
 *
 * Portal, kunci gulir, kurungan fokus, dan Escape mengikuti `GantiJenisModal`.
 */
function IsiModal({ jumlahPertanyaan, isSubmitting, error, onConfirm, onCancel }) {
  const idJudul = useId();
  const refDialog = useRef(null);

  useBodyScrollLock(true);
  useFocusTrap(refDialog, true);

  useEffect(() => {
    const handler = (e) => {
      // Selagi menyimpan, Escape tidak menutup: permintaan sudah berjalan.
      if (e.key === 'Escape' && !isSubmitting) onCancel?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSubmitting, onCancel]);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && !isSubmitting && onCancel?.()}
    >
      <div
        ref={refDialog}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-[28rem] max-h-full flex flex-col"
      >
        <div className="px-6 pt-5 pb-4 bg-primary-container/20 border-b border-primary/10 relative shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            aria-label="Tutup"
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all disabled:opacity-50"
          >
            <X size={18} />
          </button>
          <div className="flex items-center gap-3 pr-8">
            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-primary-container/40">
              <ShieldCheck size={20} className="text-primary" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Konfirmasi Aksi
              </p>
              <h3 id={idJudul} className="font-bold text-slate-800 text-base leading-tight">
                Ganti Jenis Survei ke SKM
              </h3>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3 flex-1 min-h-0 overflow-y-auto text-sm text-slate-600 leading-relaxed">
          <p>Survei ini akan menjadi SKM PermenPANRB:</p>
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              Kesembilan unsur baku (U1 sampai U9) ditambahkan di awal survei dengan kalimat baku.
              Kalimatnya dapat Anda ubah, tetapi unsurnya tidak dapat dihapus.
            </li>
            <li>
              {jumlahPertanyaan > 0
                ? `${jumlahPertanyaan} pertanyaan Anda tetap dipertahankan`
                : 'Pertanyaan yang Anda tambahkan kelak'}{' '}
              di belakangnya sebagai pertanyaan tambahan, dan tidak dihitung dalam Nilai IKM.
            </li>
            <li>Pengaturan tujuan dan metode Nilai Survei dibuang, karena SKM memakai Nilai IKM.</li>
          </ul>

          {error && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-error-container text-on-error-container text-sm font-semibold"
            >
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 shrink-0 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 min-h-[44px] px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => onConfirm()}
            className="flex-1 min-h-[44px] px-4 rounded-xl text-on-primary font-semibold text-sm bg-primary hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Menyimpan...' : 'Ganti ke SKM'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GantiJenisKeSkmModal({
  isOpen = false,
  jumlahPertanyaan = 0,
  isSubmitting = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  // `document` diperiksa karena berkas ini ikut terangkut ke bundel server.
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <IsiModal
      jumlahPertanyaan={jumlahPertanyaan}
      isSubmitting={isSubmitting}
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
    document.body,
  );
}
