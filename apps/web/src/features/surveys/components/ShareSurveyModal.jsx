'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { copyToClipboard } from '@/utils/clipboard';
import { simpanBlob } from '@/utils/unduhBerkas';
import { gambarPosterQr } from '@/features/surveys/utils/posterQrSurvei';
import { X, Copy, Check, Download, ExternalLink, Info, AlertTriangle } from 'lucide-react';

/**
 * Resolusi QR yang dibuat; tampilannya di modal dikecilkan lewat CSS.
 *
 * 1024 (naik dari 512, 22 September 2026) karena poster menggambarnya pada
 * 620px untuk dicetak. Memperbesar 512 ke 620 membuat modulnya berbayang, dan
 * QR cetak yang berbayang lebih lambat dipindai.
 */
const QR_PIXEL_SIZE = 1024;

/**
 * Zona sunyi dalam satuan modul. Spesifikasi QR meminta 4; nilai sebelumnya 1,
 * dan bantalan setipis itu membuat pemindai kesulitan menemukan batas kodenya
 * -- terutama pada poster tercetak yang di sekelilingnya ada teks dan warna.
 */
const QR_MARGIN_MODUL = 4;

/**
 * Bagikan tautan pengisian survei beserta QR-nya (Admin OPD & Admin Kabupaten).
 *
 * Tautan dibentuk dari `window.location.origin` saat modal terbuka, BUKAN dari
 * env var: origin itulah yang benar-benar dipakai pengguna (dev, staging, atau
 * produksi) sehingga QR tak pernah menunjuk host yang salah karena env lupa
 * diisi. Karena itu pula seluruh isi modal dirender di klien.
 *
 * Rute tujuannya `/survei/:id` (8 September 2026), sebelumnya `/isi/:id`
 * (4 September 2026) dan sebelum itu `/surveys/:id`. Catatan lama di sini
 * menyatakan "SKM tak menerima jawaban anonim tanpa sesi" -- itu sudah tidak
 * berlaku. `/survei/*` berada di luar `config.matcher` milik proxy.js,
 * sehingga proxy tak berjalan untuk rute itu dan pengunjung tanpa sesi tidak
 * dipantulkan ke beranda. Satu tautan/QR karena itu berlaku untuk semua orang:
 * yang bersesi tercatat atas namanya, yang tidak dikirim anonim (hanya bila
 * survei ini `izinkanAnonim`).
 *
 * Yang DIBAGIKAN selalu alamat baru, bukan yang lama. `/isi/:id` masih hidup
 * sebagai pengalihan permanen bagi QR yang sudah tercetak, tetapi tautan baru
 * yang lewat pengalihan menambah satu perjalanan jaringan pada setiap
 * pemindaian.
 */
export default function ShareSurveyModal({ survey, namaInstansi = '', onClose }) {
  // Dihitung saat inisialisasi state, BUKAN di dalam useEffect: menyetel state
  // secara sinkron di dalam effect memicu render berjenjang (aturan
  // react-hooks/set-state-in-effect). Modal ini hanya dirender setelah tombol
  // diklik, jadi `window` pasti sudah ada; penjagaan `typeof window` tetap
  // dipasang agar aman bila kelak dirender saat prerender.
  const [url] = useState(() =>
    typeof window === 'undefined' ? '' : `${window.location.origin}/survei/${survey.id}`,
  );
  const [qrDataUrl, setQrDataUrl] = useState(null);
  const [qrError, setQrError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [sedangMenyusun, setSedangMenyusun] = useState(false);
  const [galatPoster, setGalatPoster] = useState(null);
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
          margin: QR_MARGIN_MODUL,
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

  /**
   * Penanganan secure-context DIPINDAH ke utils/clipboard.js (2 September
   * 2026). Pengetahuan itu tadinya hanya hidup di sini, dan akibatnya
   * terbukti: AdminSurveyCardActions memanggil `navigator.clipboard` mentah
   * lalu melempar di `http://skema.local`. Satu tempat, satu perilaku.
   *
   * Bila menyalin benar-benar gagal, tautannya DISELEKSI supaya pengguna bisa
   * menyalin manual -- dan `setCopied` sengaja tak dijalankan: memberi tanda
   * "Tersalin" untuk sesuatu yang tak tersalin lebih buruk daripada tak
   * memberi tanda sama sekali.
   */
  const handleCopy = async () => {
    const berhasil = await copyToClipboard(url);
    if (!berhasil) {
      urlInputRef.current?.select();
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  /**
   * Unduhan QR adalah POSTER, bukan QR polos (22 September 2026, permintaan
   * pengguna). Berkas lama hanya berisi kotak QR; ditempel di loket, gambar itu
   * tak memberi tahu survei apa, milik instansi mana, dan tak memberi jalan
   * lain bagi yang kameranya menolak memindai.
   *
   * Disusun saat DIKLIK, bukan disiapkan bersama QR-nya: kebanyakan yang
   * membuka modal ini hanya menyalin tautannya, dan menggambar kanvas 1080x1440
   * untuk mereka semua hanya membakar waktu yang tak diminta siapa pun.
   */
  const handleUnduh = async () => {
    if (!qrDataUrl) return;
    setGalatPoster(null);
    setSedangMenyusun(true);
    try {
      const berkas = await gambarPosterQr({
        qrDataUrl,
        judul: survey.title,
        instansi: namaInstansi,
        url,
      });
      simpanBlob(berkas, `qr-survei-${survey.id}.png`);
    } catch (err) {
      // Kegagalan harus TERLIHAT: tombol yang diklik tanpa hasil apa pun
      // terbaca sebagai peramban yang lambat, dan penggunanya menunggu berkas
      // yang tak akan pernah turun.
      setGalatPoster(err.message);
    } finally {
      setSedangMenyusun(false);
    }
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

          {/* HANYA saat survei aktif. Keterangan ini menggambarkan tautan yang
              berfungsi ("dapat diisi tanpa login" / "perlu masuk lewat SSO");
              pada survei draf maupun yang sudah ditutup ia terpasang tepat di
              bawah spanduk kuning yang mengatakan tautannya belum/tidak dapat
              diisi. Dua pernyataan berlawanan dalam satu layar, dan yang bawah
              terdengar lebih meyakinkan karena berbicara soal cara kerja. */}
          {isActive && (
            <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
              <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 font-medium leading-relaxed">
                {survey.izinkanAnonim
                  ? 'Survei ini dapat diisi tanpa login. Satu tautan/QR berlaku untuk semua orang; responden yang sudah masuk tetap tercatat atas namanya.'
                  : 'Responden perlu masuk lewat SSO terlebih dahulu; tautan ini akan mengarahkan mereka ke halaman masuk bila belum ada sesi.'}
              </p>
            </div>
          )}
        </div>

        {galatPoster && (
          <div className="px-6 pb-1">
            <p role="alert" className="text-xs text-red-600 font-medium leading-relaxed">
              Gagal menyiapkan poster QR: {galatPoster}
            </p>
          </div>
        )}

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
          <button
            type="button"
            onClick={handleUnduh}
            disabled={!qrDataUrl || sedangMenyusun}
            className="flex-1 min-h-[44px] py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Download size={16} />
            {sedangMenyusun ? 'Menyiapkan…' : 'Unduh QR'}
          </button>
        </div>
      </div>
    </div>
  );
}
