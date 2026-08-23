'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { X, Copy, Check, Download, ExternalLink, Info, AlertTriangle } from 'lucide-react';

const QR_PIXEL_SIZE = 512; // resolusi berkas unduhan; tampilannya dikecilkan lewat CSS

/**
 * Bagikan tautan pengisian survei beserta QR-nya (Admin OPD & Admin Kabupaten).
 *
 * Tautan dibentuk dari `window.location.origin` saat modal terbuka, BUKAN dari
 * env var: origin itulah yang benar-benar dipakai pengguna (dev, staging, atau
 * produksi) sehingga QR tak pernah menunjuk host yang salah karena env lupa
 * diisi. Karena itu pula seluruh isi modal dirender di klien.
 *
 * Rute tujuan `/surveys/:id` dijaga proxy.js khusus peran `responden` -- warga
 * yang belum masuk akan diarahkan ke beranda untuk login dulu. Itu perilaku yang
 * memang dirancang (SKM tak menerima jawaban anonim tanpa sesi), jadi di sini
 * hanya diberi keterangan supaya admin tak menyangka tautannya rusak.
 */
export default function ShareSurveyModal({ survey, onClose }) {
  // Dihitung saat inisialisasi state, BUKAN di dalam useEffect: menyetel state
  // secara sinkron di dalam effect memicu render berjenjang (aturan
  // react-hooks/set-state-in-effect). Modal ini hanya dirender setelah tombol
  // diklik, jadi `window` pasti sudah ada; penjagaan `typeof window` tetap
  // dipasang agar aman bila kelak dirender saat prerender.
  const [url] = useState(() =>
    typeof window === 'undefined' ? '' : `${window.location.origin}/surveys/${survey.id}`,
  );
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrError, setQrError] = useState(null);
  const [copied, setCopied] = useState(false);
  const urlInputRef = useRef(null);

  useEffect(() => {
    if (!url) return undefined;

    let dibatalkan = false;
    // Impor dinamis: pustaka QR (~20 KB) hanya diunduh saat modal dibuka,
    // tak membebani bundel awal halaman kelola survei.
    import('qrcode')
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(url, {
          width: QR_PIXEL_SIZE,
          margin: 1,
          color: { dark: '#0F172A', light: '#FFFFFF' },
        }),
      )
      .then((dataUrl) => {
        if (!dibatalkan) setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        if (!dibatalkan) setQrError(err.message);
      });

    return () => {
      dibatalkan = true;
    };
  }, [url]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  // Pola inline lama dipindah ke hooks/useBodyScrollLock.js (2026-08-24).
  useBodyScrollLock();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // navigator.clipboard butuh secure context -- pada intranet http biasa
      // (bukan localhost) ia gagal. Jatuh ke seleksi + execCommand agar tombol
      // tetap berguna di lingkungan seperti itu.
      urlInputRef.current?.select();
      try {
        document.execCommand('copy');
      } catch {
        return; // benar-benar tak bisa: biarkan pengguna menyalin manual
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isActive = survey.status === 'AKTIF';

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-[460px]">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
          >
            <X size={18} />
          </button>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Bagikan Survei</p>
          <h3 className="font-bold text-slate-800 text-lg leading-tight mt-1 pr-8" title={survey.title}>
            {survey.title}
          </h3>
        </div>

        <div className="px-6 py-5 space-y-4">
          {!isActive && (
            <div className="flex items-start gap-2.5 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-800 font-medium leading-relaxed">
                {survey.status === 'DRAF'
                  ? 'Survei masih berstatus draf, sehingga tautan ini belum dapat diisi. Publikasikan dulu sebelum membagikannya.'
                  : 'Periode survei sudah ditutup, sehingga tautan ini tidak menerima jawaban baru.'}
              </p>
            </div>
          )}

          {/* QR */}
          <div className="flex justify-center">
            {qrError ? (
              <div className="w-[200px] h-[200px] flex items-center justify-center text-center text-xs text-red-600 border border-red-200 bg-red-50 rounded-xl p-4">
                Gagal membuat QR: {qrError}
              </div>
            ) : qrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- data URL hasil generate di klien, bukan aset statis yang bisa dioptimasi next/image
              <img
                src={qrDataUrl}
                alt={`QR code tautan pengisian survei ${survey.title}`}
                className="w-[200px] h-[200px] rounded-xl border border-slate-200"
              />
            ) : (
              <div className="w-[200px] h-[200px] rounded-xl bg-slate-100 animate-pulse" />
            )}
          </div>

          {/* Tautan */}
          <div className="space-y-1.5">
            <span className="block text-sm font-bold text-text-primary">Tautan pengisian</span>
            <div className="flex gap-2">
              <input
                ref={urlInputRef}
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                className="flex-1 min-w-0 min-h-[44px] px-3 border border-outline-variant rounded-lg bg-surface-container-low text-sm font-mono text-text-secondary outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleCopy}
                className="shrink-0 min-h-[44px] px-4 rounded-lg bg-primary text-on-primary font-bold text-sm hover:bg-primary-hover transition-colors flex items-center gap-2"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Tersalin' : 'Salin'}
              </button>
            </div>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              Responden perlu masuk lewat SSO terlebih dahulu; tautan ini akan mengarahkan mereka ke
              halaman masuk bila belum ada sesi.
            </p>
          </div>
        </div>

        <div className="px-6 pb-6 pt-2 flex flex-col sm:flex-row gap-2 sm:gap-3 border-t border-slate-100 pt-4">
          <a
            href={url || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
          >
            <ExternalLink size={16} />
            Buka Tautan
          </a>
          <a
            href={qrDataUrl ?? '#'}
            download={`qr-survei-${survey.id}.png`}
            aria-disabled={!qrDataUrl}
            className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 ${
              qrDataUrl ? '' : 'opacity-60 pointer-events-none'
            }`}
          >
            <Download size={16} />
            Unduh QR
          </a>
        </div>
      </div>
    </div>
  );
}
