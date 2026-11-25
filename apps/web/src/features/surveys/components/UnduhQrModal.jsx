'use client';

import React, { useCallback, useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import { useFocusTrap } from '@/hooks/useFocusTrap';
import { simpanBlob } from '@/utils/unduhBerkas';
import { gambarPosterQr } from '@/features/surveys/utils/posterQrSurvei';
import { X, Download, QrCode } from 'lucide-react';

/**
 * Ubah data URL base64 menjadi Blob tanpa `fetch`.
 *
 * `fetch(dataUrl)` memang lebih pendek, tetapi jsdom tak menjalankannya untuk
 * skema `data:`, dan uji unduhan QR polos lalu tak dapat membuktikan isi
 * berkasnya. Pengodean ulang manual ini bekerja sama di keduanya.
 */
function dataUrlKeBlob(dataUrl) {
  const [kepala, isi] = dataUrl.split(',');
  const jenis = kepala.match(/^data:([^;]+)/)?.[1] ?? 'image/png';
  const biner = atob(isi);
  const byte = new Uint8Array(biner.length);
  for (let i = 0; i < biner.length; i += 1) byte[i] = biner.charCodeAt(i);
  return new Blob([byte], { type: jenis });
}

/**
 * Pilihan unduhan QR survei: QR polos atau QR dengan desain (25 November 2026,
 * permintaan pengguna).
 *
 * Dibuka dari tombol "Unduh QR" di ShareSurveyModal. Sebelumnya tombol itu
 * langsung menurunkan poster, sehingga QR polos -- yang dibutuhkan bila OPD
 * hendak menempelkannya ke desain sendiri -- tak dapat diperoleh sama sekali.
 *
 * PRATINJAUNYA POSTER SURVEI INI SENDIRI, bukan gambar contoh statis (keputusan
 * pengguna): judul dan instansinya sama dengan berkas yang akan turun. Blob
 * hasil gambarnya disimpan dan dipakai lagi oleh tombol "dengan Desain",
 * jadi kanvas 1080x1440 itu tak digambar dua kali.
 *
 * DI-PORTAL ke `document.body`, tidak dirender di dalam modal Bagikan.
 * `useFocusTrap` memasang pendengar keydown NATIVE pada wadah dialog; bila
 * modal ini bersarang di DOM modal Bagikan, Tab dari dalamnya ikut naik ke
 * pengurung luar, yang menghitung tombol-tombol modal ini sebagai anggotanya
 * dan melingkarkan fokus ke tempat yang salah.
 *
 * QR polos yang diunduh adalah `qrDataUrl` apa adanya: 1024px dengan zona sunyi
 * 4 modul, sama dengan yang tampil di modal Bagikan.
 *
 * @param {{
 *   survey: {id: number|string, title: string},
 *   url: string,
 *   qrDataUrl: string,
 *   namaInstansi?: string,
 *   onClose: () => void,
 * }} props
 */
export default function UnduhQrModal({ survey, url, qrDataUrl, namaInstansi = '', onClose }) {
  const [posterBlob, setPosterBlob] = useState(null);
  const [pratinjauUrl, setPratinjauUrl] = useState(null);
  const [galatPoster, setGalatPoster] = useState(null);
  const [sedangMenyusun, setSedangMenyusun] = useState(true);

  const susunPoster = useCallback(
    () => gambarPosterQr({ qrDataUrl, judul: survey.title, instansi: namaInstansi, url }),
    [qrDataUrl, survey.title, namaInstansi, url],
  );

  /**
   * Satu-satunya tempat object URL pratinjau dibuat dan dilepas. Dipanggil dari
   * penyusunan awal maupun dari percobaan ulang di tombol "dengan Desain",
   * supaya poster yang baru berhasil disusun ikut tampil sebagai pratinjau.
   */
  const refPratinjau = useRef(null);
  const pasangPoster = useCallback((blob) => {
    if (refPratinjau.current) URL.revokeObjectURL(refPratinjau.current);
    refPratinjau.current = URL.createObjectURL(blob);
    setPosterBlob(blob);
    setPratinjauUrl(refPratinjau.current);
  }, []);

  // Tanpa ini setiap pembukaan modal menahan poster ratusan kilobyte di memori
  // tab sampai halamannya ditutup.
  useEffect(
    () => () => {
      if (refPratinjau.current) URL.revokeObjectURL(refPratinjau.current);
      refPratinjau.current = null;
    },
    [],
  );

  useEffect(() => {
    let dibatalkan = false;

    susunPoster()
      .then((blob) => {
        if (!dibatalkan) pasangPoster(blob);
      })
      .catch((err) => {
        if (!dibatalkan) setGalatPoster(err.message);
      })
      .finally(() => {
        if (!dibatalkan) setSedangMenyusun(false);
      });

    return () => {
      dibatalkan = true;
    };
  }, [susunPoster, pasangPoster]);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  useBodyScrollLock();

  const idLabel = useId();
  const idJudul = useId();
  const refDialog = useRef(null);
  useFocusTrap(refDialog, true);

  const unduhPolos = () => {
    simpanBlob(dataUrlKeBlob(qrDataUrl), `qr-survei-${survey.id}-polos.png`);
  };

  /**
   * Poster yang gagal disusun saat modal dibuka DICOBA LAGI di sini, bukan
   * membuat tombolnya mati permanen: kegagalan canvas bisa sesaat (tab di latar,
   * memori sempit), dan tombol yang tak dapat diklik tak memberi jalan keluar.
   */
  const unduhDesain = async () => {
    if (posterBlob) {
      simpanBlob(posterBlob, `qr-survei-${survey.id}-poster.png`);
      return;
    }
    setGalatPoster(null);
    setSedangMenyusun(true);
    try {
      const blob = await susunPoster();
      pasangPoster(blob);
      simpanBlob(blob, `qr-survei-${survey.id}-poster.png`);
    } catch (err) {
      setGalatPoster(err.message);
    } finally {
      setSedangMenyusun(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    // Latar yang menggulir dan klik di pembungkus dalam: pola yang sama dengan
    // ShareSurveyModal (BUG-087), supaya kartu yang lebih tinggi daripada layar
    // pendek tetap dapat digulir sampai tombolnya.
    <div className="fixed inset-0 z-[10000] overflow-y-auto overscroll-contain bg-slate-900/45 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="flex min-h-full items-center justify-center p-4"
        onClick={(e) => e.target === e.currentTarget && onClose?.()}
      >
        <div
          ref={refDialog}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${idLabel} ${idJudul}`}
          className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-[600px] focus:outline-none"
        >
          <div className="px-6 pt-6 pb-4 border-b border-slate-100 relative">
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <p id={idLabel} className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Unduh QR
            </p>
            <h3
              id={idJudul}
              className="font-bold text-slate-800 text-lg leading-tight mt-1 pr-8"
              title={survey.title}
            >
              {survey.title}
            </h3>
          </div>

          <div className="px-6 py-5">
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-5">
              {pratinjauUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- blob URL hasil canvas di klien, bukan aset statis yang bisa dioptimasi next/image
                <img
                  src={pratinjauUrl}
                  alt={`Pratinjau poster QR survei ${survey.title}`}
                  className="h-[280px] sm:h-[320px] w-auto rounded-md bg-white shadow-lg ring-1 ring-slate-900/5"
                />
              ) : galatPoster ? (
                <div className="flex h-[280px] sm:h-[320px] aspect-[3/4] items-center justify-center rounded-md border border-red-200 bg-red-50 p-4 text-center">
                  <p role="alert" className="text-xs font-medium leading-relaxed text-red-600">
                    Gagal menyiapkan poster QR: {galatPoster}
                  </p>
                </div>
              ) : (
                <div
                  aria-hidden="true"
                  className="h-[280px] sm:h-[320px] aspect-[3/4] rounded-md bg-slate-200 animate-pulse"
                />
              )}
              <p className="text-xs font-medium text-slate-500 text-center">
                Pratinjau QR dengan desain, siap dicetak ukuran A5
              </p>
            </div>
          </div>

          {/* "dengan Desain" didahulukan di ponsel (`order-first`) karena itulah
              yang paling sering dipakai untuk dicetak; di layar lebar ia di
              kanan, posisi tombol utama pada modal lain di aplikasi ini. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-slate-100 px-6 pt-4 pb-6">
            <button
              type="button"
              onClick={unduhPolos}
              className="flex min-h-[64px] items-center gap-3 rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-left text-slate-800 transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-slate-100 text-slate-700">
                <QrCode size={20} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold leading-tight">Unduh QR Polos</span>
                <span className="mt-0.5 block text-xs text-slate-500">Kotak QR saja · PNG</span>
              </span>
            </button>
            <button
              type="button"
              onClick={unduhDesain}
              disabled={sedangMenyusun}
              className="order-first sm:order-none flex min-h-[64px] items-center gap-3 rounded-xl border border-primary bg-primary px-3.5 py-3 text-left text-on-primary shadow-md shadow-primary/30 transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/15">
                <Download size={20} aria-hidden="true" />
              </span>
              <span>
                <span className="block text-sm font-bold leading-tight">Unduh QR dengan Desain</span>
                <span className="mt-0.5 block text-xs text-blue-100">
                  {sedangMenyusun ? 'Menyiapkan poster…' : 'Poster siap cetak A5 · PNG'}
                </span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
