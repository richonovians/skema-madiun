'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  Download,
  ExternalLink,
  FileText,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Paperclip,
} from 'lucide-react';
import ImageLightbox from '@/components/ui/ImageLightbox';
import { unduhDariUrl } from '@/utils/unduhBerkas';

/**
 * Galeri lampiran pada halaman detail pengaduan Admin Kabupaten.
 *
 * LAPORAN PENGGUNA 7 September 2026: "pada halaman admin saya tidak bisa
 * melihat dan mendownload gambarnya meskipun tidak menampilkan 403."
 *
 * Sebabnya BUKAN penjaga URL bertanda tangan (T1). Diukur di peramban:
 * thumbnail-nya justru berhasil dimuat (naturalWidth 1331, tanpa satu pun galat
 * jaringan). Sebabnya kedua tombol di kartu ini tak pernah punya handler sama
 * sekali -- `<button>` kosong tanpa `onClick` maupun `href`. Itu pula sebab tak
 * ada 403: tak ada permintaan yang pernah dikirim. Komponen ini memang
 * "dibangun dgn kontrak dummy lama" (komentar di halamannya sendiri).
 *
 * Tiga hal yang diperbaiki:
 *   1. Perbesar -> ImageLightbox, DIPAKAI BERSAMA ImageViewer sisi warga. Bukan
 *      lightbox kedua yang disalin: yang pertama sudah memuat perbaikan
 *      `useBodyScrollLock`, dan salinan akan berangkat tanpa perbaikan itu lalu
 *      diam-diam menyimpang.
 *   2. Unduh -> `unduhDariUrl`. TIDAK memakai `<a download>`: atribut itu
 *      DIABAIKAN peramban untuk URL lintas-origin, jadi tautan biasa cuma
 *      membuka berkasnya di tab baru dengan nama acak, bukan menyimpannya.
 *   3. PDF -> dapat dibuka di tab baru. Sebelumnya ia hanya ikon tanpa aksi apa
 *      pun, sehingga sama sekali tak terjangkau dari halaman admin.
 *
 * Kegagalan unduh DITAMPILKAN, tidak ditelan: tautan lampiran berbatas waktu
 * (baku 1 jam sejak T1), dan "tidak terjadi apa-apa" adalah persis keluhan yang
 * memulai perbaikan ini.
 */
export default function ComplaintAttachmentGallery({ complaint }) {
  const attachments = complaint.attachments || [];
  /** Lampiran gambar yang sedang dilihat besar; null = lightbox tertutup. */
  const [dilihat, setDilihat] = useState(null);
  /** id lampiran yang sedang diunduh; null = tak ada. */
  const [sedangUnduh, setSedangUnduh] = useState(null);
  /** `{ id, pesan }` galat unduh terakhir, ditampilkan pada kartunya sendiri. */
  const [galat, setGalat] = useState(null);

  if (attachments.length === 0) return null;

  const unduh = async (file) => {
    setGalat(null);
    setSedangUnduh(file.id);
    try {
      await unduhDariUrl(file.url, file.name);
    } catch (err) {
      setGalat({ id: file.id, pesan: err.message });
    } finally {
      setSedangUnduh(null);
    }
  };

  // `noopener,noreferrer`: tab baru tak boleh memegang `window.opener` halaman
  // admin, dan URL bertanda tangan tak perlu ikut terkirim sebagai `Referer`.
  const bukaTab = (file) => window.open(file.url, '_blank', 'noopener,noreferrer');

  return (
    <div className="bg-surface rounded-2xl shadow-sm border border-outline-variant overflow-hidden">
      <div className="px-lg py-md border-b border-outline-variant bg-slate-50 flex items-center gap-2">
        <Paperclip size={18} className="text-slate-500" />
        <h3 className="text-title-md font-bold text-slate-800">Lampiran ({attachments.length})</h3>
      </div>

      <div className="p-lg grid grid-cols-1 sm:grid-cols-2 gap-4">
        {attachments.map((file) => {
          const gambar = file.type === 'image';
          const memuat = sedangUnduh === file.id;
          const galatKartu = galat?.id === file.id ? galat.pesan : null;

          return (
            <div
              key={file.id}
              className="group relative flex flex-col border border-slate-200 rounded-xl overflow-hidden hover:border-primary/50 transition-colors bg-white"
            >
              {/* Area pratinjau SELURUHNYA dapat diklik, bukan cuma ikon kecil
                  di tengahnya. Sebagai <button> (bukan div ber-onClick) supaya
                  terjangkau papan tombol dan punya nama yang terbaca. */}
              <button
                type="button"
                onClick={() => (gambar ? setDilihat(file) : bukaTab(file))}
                aria-label={`${gambar ? 'Lihat' : 'Buka'} ${file.name}`}
                className="h-32 w-full bg-slate-100 flex items-center justify-center relative overflow-hidden hover:bg-slate-200 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                {gambar ? (
                  <>
                    <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                    <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                      <Maximize2 size={20} aria-hidden="true" />
                    </span>
                  </>
                ) : (
                  <span className="flex flex-col items-center gap-1 text-slate-400">
                    <FileText size={36} aria-hidden="true" />
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-500">
                      <ExternalLink size={11} aria-hidden="true" /> Buka
                    </span>
                  </span>
                )}
              </button>

              <div className="p-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {gambar ? (
                    <ImageIcon size={16} className="text-blue-500 shrink-0" aria-hidden="true" />
                  ) : (
                    <FileText size={16} className="text-orange-500 shrink-0" aria-hidden="true" />
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-700 truncate" title={file.name}>
                      {file.name}
                    </p>
                    <p className="text-[10px] text-slate-400">{file.size}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => unduh(file)}
                  disabled={memuat}
                  aria-label={`Unduh ${file.name}`}
                  className="h-8 w-8 p-0 flex items-center justify-center rounded-full shrink-0 text-slate-400 hover:text-primary hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  {memuat ? (
                    <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Download size={16} aria-hidden="true" />
                  )}
                </button>
              </div>

              {galatKartu && (
                <p
                  role="alert"
                  className="flex items-start gap-1.5 px-3 pb-3 text-xs font-medium text-on-error-container"
                >
                  <AlertTriangle size={13} className="mt-0.5 shrink-0" aria-hidden="true" />
                  {galatKartu}
                </p>
              )}
            </div>
          );
        })}
      </div>

      {dilihat && (
        <ImageLightbox src={dilihat.url} alt={dilihat.name} onClose={() => setDilihat(null)} />
      )}
    </div>
  );
}
