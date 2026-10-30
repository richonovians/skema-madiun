'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { CheckCircle2, Home, FileText } from 'lucide-react';
import useSurveyStore from '../store/useSurveyStore';

/**
 * @param {boolean} [tampilkanTautanWarga] Tautan "Daftar Survei" & "Dashboard"
 * keduanya menuju rute khusus peran `responden` (/surveys, /dashboard), yang
 * memantulkan pengunjung tanpa sesi ke '/'. Pengisi anonim lewat /survei/:id
 * karena itu diberi satu tautan ke halaman depan publik `/`, berlabel
 * "Kembali ke Layanan" — jalan buntu adalah cacat, bukan detail kosmetik. Baku
 * `true` supaya pemakaian yang sudah ada tak berubah.
 *
 * @param {boolean} [tampilkanKepala] Logo, nama "SKEMA Madiun", dan lencana
 * "Terkirim". Dimatikan di `/surveys/[id]` (30 Oktober 2026, permintaan
 * pengguna): di sana navbar aplikasi sudah membawa mereknya. Halaman publik
 * `/survei/[id]` tak punya navbar, jadi bawaannya tetap `true`.
 */
export default function SurveyCompletion({
  tampilkanTautanWarga = true,
  tampilkanKepala = true,
  surveyTitle,
}) {
  const { surveyData } = useSurveyStore();
  const judulSurvei = surveyTitle || surveyData?.title || 'Evaluasi Mutu Pelayanan';

  return (
    // `max-w-[500px]` sama dengan pembungkus halaman publik; tanpa itu kartunya
    // melebar selebar kontainer halaman `/surveys/[id]`.
    <div className="w-full max-w-[500px] mx-auto bg-white rounded-2xl shadow-2xl border border-slate-100/90 text-center overflow-hidden">
      {/* Header kartu: logo SKEMA Madiun */}
      {tampilkanKepala && (
        <div className="border-b border-slate-100 px-5 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2.5 group shrink-0">
            <div className="transition-transform duration-300 group-hover:scale-105 flex items-center">
              <Image
                src="/images/navbar/skema-logo-2.png"
                alt="Logo SKEMA"
                width={76}
                height={48}
                className="object-contain h-7 w-auto"
                priority
              />
            </div>
            <span className="text-sm font-bold text-primary tracking-tight">
              SKEMA Madiun
            </span>
          </Link>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/70">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Terkirim
          </span>
        </div>
      )}

      <div className="px-5 py-7 sm:px-8 sm:py-9 flex flex-col items-center">
        {/* Ikon Sukses dengan Animasi */}
        <div className="relative mb-4 group inline-flex items-center justify-center">
          {/* Efek denyut ripple di belakang */}
          <div className="absolute inset-0 bg-emerald-400/20 rounded-full animate-ping pointer-events-none duration-1000" />

          {/* Lingkaran Ikon Utama */}
          <div className="relative w-16 h-16 sm:w-20 sm:h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center border-2 border-emerald-100 shadow-xs ring-4 ring-emerald-50 transition-all duration-500 ease-out group-hover:scale-105 group-hover:rotate-6 animate-in zoom-in-50 duration-500">
            <CheckCircle2 size={36} strokeWidth={2.5} className="sm:w-10 sm:h-10 transition-transform duration-300 group-hover:scale-110" />
          </div>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-text-primary mb-2 tracking-tight">
          Terima Kasih!
        </h2>

        {/* Kotak Informasi Survei */}
        <div className="w-full max-w-[380px] mx-auto mb-6 sm:mb-7 space-y-3">
          <div className="bg-slate-50 border border-slate-100 rounded-xl px-4 py-3">
            <p className="text-xs text-text-secondary mb-1">Tanggapan Anda untuk survei:</p>
            <p className="text-sm sm:text-base font-semibold text-text-primary leading-snug">
              &quot;{judulSurvei}&quot;
            </p>
          </div>
          <p className="text-xs sm:text-sm text-text-secondary leading-relaxed px-2">
            Telah berhasil dikirim. Penilaian Anda sangat berarti bagi peningkatan kualitas layanan publik kami.
          </p>
        </div>

        {/* Tombol Aksi Responsif */}
        <div className="w-full max-w-[380px] mx-auto flex flex-col-reverse sm:flex-row items-center gap-3">
          {!tampilkanTautanWarga && (
            <Link href="/" className="w-full block">
              <button className="w-full min-h-[44px] flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-semibold hover:bg-primary-hover shadow-xs hover:shadow-primary/20 transition-all active:scale-95">
                <Home size={16} className="shrink-0" />
                <span>Kembali ke Layanan</span>
              </button>
            </Link>
          )}
          {tampilkanTautanWarga && (
            <>
              <Link href="/surveys" className="w-full sm:w-1/2 block">
                <button className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 text-text-secondary text-xs sm:text-sm font-semibold hover:bg-slate-50 hover:text-text-primary transition-all active:scale-95">
                  <FileText size={16} className="shrink-0" />
                  <span>Daftar Survei</span>
                </button>
              </Link>
              <Link href="/dashboard" className="w-full sm:w-1/2 block">
                <button className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-white text-xs sm:text-sm font-semibold hover:bg-primary-hover shadow-xs hover:shadow-primary/20 transition-all active:scale-95">
                  <Home size={16} className="shrink-0" />
                  <span>Dashboard</span>
                </button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
