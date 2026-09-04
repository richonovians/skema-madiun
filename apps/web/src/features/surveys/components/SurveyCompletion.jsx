'use client';

import React from 'react';
import Link from 'next/link';
import { CheckCircle2, Home, FileText } from 'lucide-react';
import useSurveyStore from '../store/useSurveyStore';

/**
 * @param {boolean} [tampilkanTautanWarga] Tautan "Daftar Survei" & "Beranda"
 * keduanya menuju rute khusus peran `responden` (/surveys, /dashboard), yang
 * memantulkan pengunjung tanpa sesi ke '/'. Pengisi anonim lewat /isi/:id
 * karena itu diberi satu tautan beranda publik — jalan buntu adalah cacat,
 * bukan detail kosmetik. Baku `true` supaya pemakaian yang sudah ada tak berubah.
 */
export default function SurveyCompletion({ tampilkanTautanWarga = true }) {
  const { surveyData } = useSurveyStore();

  return (
    <div className="bg-white/80 backdrop-blur-lg rounded-[2rem] shadow-2xl shadow-primary/5 p-lg md:p-xl border border-white text-center w-full max-w-[672px] mx-auto mt-lg relative overflow-hidden">
      
      {/* Decorative Background Blob */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[400px] h-64 bg-gradient-to-b from-green-400/20 to-transparent blur-3xl -z-10 rounded-full pointer-events-none"></div>

      <div className="relative z-10 flex flex-col items-center">
        {/* Animated Success Icon */}
        <div className="relative mb-lg mt-md group">
          <div className="absolute inset-0 bg-green-400 rounded-full animate-ping opacity-20"></div>
          <div className="w-[96px] h-[96px] bg-gradient-to-tr from-green-500 to-emerald-400 text-white rounded-full flex items-center justify-center shadow-lg shadow-green-500/30 transform transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3">
            <CheckCircle2 size={48} strokeWidth={2.5} />
          </div>
        </div>
        
        <h2 className="font-h1 text-h1 text-text-primary mb-md tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-text-primary to-text-secondary">
          Terima Kasih!
        </h2>
        
        {/* Modern Info Card */}
        <div className="bg-white/60 border border-border rounded-2xl p-md md:p-lg mb-xl w-full shadow-sm hover:shadow-md transition-shadow">
          <p className="text-body-md text-text-secondary mb-xs">Tanggapan Anda untuk survei:</p>
          <p className="font-h3 text-h3 text-text-primary leading-snug mb-sm">
            &quot;{surveyData?.title || 'Evaluasi Mutu Pelayanan'}&quot;
          </p>
          <div className="w-16 h-1 bg-gradient-to-r from-primary to-emerald-400 mx-auto rounded-full mb-md"></div>
          <p className="text-body-md text-text-secondary">
            Telah berhasil dikirim. Penilaian Anda sangat berarti bagi peningkatan kualitas layanan publik kami.
          </p>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center w-full gap-md">
          {!tampilkanTautanWarga && (
            <Link href="/" className="w-full sm:w-1/2 mx-auto block">
              <button className="w-full flex items-center justify-center gap-sm px-lg py-md rounded-xl bg-primary text-white font-bold hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95">
                <Home size={20} />
                <span>Kembali ke Beranda</span>
              </button>
            </Link>
          )}
          {tampilkanTautanWarga && (
          <Link href="/surveys" className="w-full sm:w-1/2 block">
            <button className="w-full flex items-center justify-center gap-sm px-lg py-md rounded-xl border border-outline text-text-secondary font-bold hover:bg-surface-container-low hover:border-outline-variant hover:text-primary transition-all active:scale-95 group/btn">
              <FileText size={20} className="group-hover/btn:scale-110 transition-transform" />
              <span>Daftar Survei</span>
            </button>
          </Link>
          )}
          {tampilkanTautanWarga && (
          <Link href="/dashboard" className="w-full sm:w-1/2 block">
            <button className="w-full flex items-center justify-center gap-sm px-lg py-md rounded-xl bg-primary text-white font-bold hover:bg-primary-hover hover:shadow-lg hover:shadow-primary/30 transition-all active:scale-95 group/btn">
              <Home size={20} className="group-hover/btn:-translate-y-1 transition-transform" />
              <span>Beranda</span>
            </button>
          </Link>
          )}
        </div>
      </div>
    </div>
  );
}
