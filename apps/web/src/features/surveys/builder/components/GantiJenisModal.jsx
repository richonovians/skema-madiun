'use client';

import React, { useEffect, useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldAlert, X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import PengaturanNilaiSurvei from './PengaturanNilaiSurvei';

/**
 * Modal GANTI JENIS SKM -> CUSTOM (8 Oktober 2026, permintaan pengguna: "tambah
 * tombol ganti jenis ketika terlanjur memilih jenis survei SKM").
 *
 * Penggantian menghapus kesembilan unsur beserta kalimatnya dan TIDAK dapat
 * dikembalikan (pertanyaan tambahan milik OPD dipertahankan). Karena itu modal
 * ini menyebut akibatnya, memperlihatkan kalimat unsur yang akan hilang, dan
 * menuntut tujuan + metode nilai -- survei Custom selalu memilikinya -- sebelum
 * tombol konfirmasi menyala.
 *
 * Digambar di `document.body` lewat portal (sebab sama dengan
 * ConfirmActionModal: BuilderLayout `relative z-50` membuat seluruh builder satu
 * lapisan, jadi `z-[9999]` di dalamnya tak berarti apa pun terhadap sidebar).
 * Badan modal dapat digulir sehingga muat di layar 320x568 walau daftar
 * unsurnya panjang.
 *
 * Isinya dipasang HANYA saat terbuka, sehingga pilihan tujuan/metode selalu
 * mulai kosong tiap dibuka (state ikut hilang saat dilepas).
 */
function IsiModal({ unsur, isSubmitting, error, onConfirm, onCancel }) {
  const idJudul = useId();
  const [tujuan, setTujuan] = useState(null);
  const [metodeNilai, setMetodeNilai] = useState(null);

  useBodyScrollLock(true);

  useEffect(() => {
    const handler = (e) => {
      // Selagi menyimpan, Escape tidak menutup: permintaan sudah berjalan.
      if (e.key === 'Escape' && !isSubmitting) onCancel?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSubmitting, onCancel]);

  const lengkap = Boolean(tujuan && metodeNilai);

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && !isSubmitting && onCancel?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idJudul}
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-[28rem] max-h-full flex flex-col"
      >
        <div className="px-6 pt-5 pb-4 bg-red-50 border-b border-red-100 relative shrink-0">
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
            <div className="w-10 h-10 shrink-0 rounded-xl flex items-center justify-center bg-red-100">
              <ShieldAlert size={20} className="text-red-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Konfirmasi Aksi
              </p>
              <h3 id={idJudul} className="font-bold text-slate-800 text-base leading-tight">
                Ganti Jenis Survei ke Custom
              </h3>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 space-y-3 flex-1 min-h-0 overflow-y-auto">
          <p className="text-sm text-slate-600 leading-relaxed">
            Kesembilan unsur baku (U1 sampai U9) beserta kalimat pertanyaannya akan{' '}
            <strong className="font-semibold">dihapus</strong> dan tidak dapat dikembalikan. Survei
            menjadi Custom tanpa Nilai IKM; pertanyaan tambahan Anda tetap dipertahankan.
          </p>

          {unsur.length > 0 && (
            <ul
              aria-label="Unsur yang akan dihapus"
              className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100 text-xs"
            >
              {unsur.map((u) => (
                <li key={u.kode} className="flex gap-2 px-3 py-2">
                  <span className="font-mono font-bold text-primary shrink-0">{u.kode}</span>
                  <span className="text-slate-600 min-w-0 break-words">{u.text}</span>
                </li>
              ))}
            </ul>
          )}

          <PengaturanNilaiSurvei
            tujuan={tujuan}
            metode={metodeNilai}
            onTujuan={setTujuan}
            onMetode={setMetodeNilai}
            disabled={isSubmitting}
            ringkas
          />

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
            disabled={!lengkap || isSubmitting}
            onClick={() => onConfirm({ tujuan, metodeNilai })}
            className="flex-1 min-h-[44px] px-4 rounded-xl text-white font-semibold text-sm bg-red-600 hover:bg-red-700 shadow-lg shadow-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Menyimpan...' : 'Ganti ke Custom'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function GantiJenisModal({
  isOpen = false,
  unsur = [],
  isSubmitting = false,
  error = null,
  onConfirm,
  onCancel,
}) {
  // `document` diperiksa karena berkas ini ikut terangkut ke bundel server.
  if (!isOpen || typeof document === 'undefined') return null;

  return createPortal(
    <IsiModal
      unsur={unsur}
      isSubmitting={isSubmitting}
      error={error}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />,
    document.body,
  );
}
