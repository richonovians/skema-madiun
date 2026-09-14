'use client';

import React, { useEffect } from 'react';
import { ShieldCheck, Send, X } from 'lucide-react';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';
import TurnstileWidget from './TurnstileWidget';
import { captchaTersedia } from '../utils/captcha';
import useSurveyStore from '../store/useSurveyStore';

/**
 * Verifikasi terakhir sebelum jawaban survei dikirim, pada jalur TANPA AKUN
 * (14 September 2026, atas permintaan pengguna).
 *
 * Captcha sengaja diminta di sini, bukan sejak pertanyaan pertama. Token
 * Turnstile berumur sekitar lima menit, sedangkan mengisi survei sepuluh
 * pertanyaan bisa lebih lama; captcha yang diselesaikan di awal akan basi
 * justru pada saat tombol kirim ditekan.
 *
 * Hanya jalur publik yang memakainya. Jalur berlogin sudah dikunci satu respons
 * per akun oleh `@@unique([surveyId, dedupeUserId])`, sedangkan di sini
 * `dedupeUserId` bernilai null dan Postgres memperlakukan NULL sebagai selalu
 * berbeda -- tak ada yang membatasi apa pun.
 */
export default function ModalKirimSurvei({ isOpen, onBatal }) {
  const { submitSurvey, isSubmitting, submitError, captchaToken, setCaptchaToken } =
    useSurveyStore();

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && isOpen) onBatal?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onBatal]);

  useBodyScrollLock(isOpen);

  if (!isOpen) return null;

  /**
   * Kuncinya bergantung pada ADA-TIDAKNYA site key, bukan pada ada-tidaknya
   * token. Tanpa site key, TurnstileWidget tak merender apa pun dan tokennya
   * tak akan pernah datang; tombol yang menunggunya akan mati selamanya dan
   * survei tak dapat dikirim sama sekali di mesin tanpa kunci Cloudflare.
   */
  const menungguCaptcha = captchaTersedia() && !captchaToken;
  const terkunci = isSubmitting || menungguCaptcha;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onBatal?.()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-kirim-survei"
        className="bg-white rounded-2xl shadow-2xl border border-slate-100 animate-in zoom-in-95 duration-200 w-full max-w-[420px]"
      >
        <div className="px-6 pt-6 pb-4 bg-primary/5 border-b border-primary/10 rounded-t-2xl relative">
          <button
            onClick={onBatal}
            aria-label="Tutup"
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary/10">
              <ShieldCheck size={20} className="text-primary" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Langkah Terakhir
              </p>
              <h3 id="judul-kirim-survei" className="font-bold text-slate-800 text-base leading-tight">
                Verifikasi Sebelum Mengirim
              </h3>
            </div>
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-sm text-slate-600 leading-relaxed">
            Selesaikan verifikasi di bawah ini, lalu kirim jawaban Anda. Setelah dikirim, jawaban
            tidak dapat diubah lagi.
          </p>

          <TurnstileWidget onToken={setCaptchaToken} className="mt-4 flex justify-center" />

          {/* Galat pengiriman dirender DI DALAM modal. Di luar, ia tertutup
              overlay dan pengisinya hanya melihat tombol yang seolah tak
              bereaksi. */}
          {submitError && (
            <p className="mt-4 text-center text-error text-sm font-semibold">{submitError}</p>
          )}
        </div>

        <div className="px-6 pb-6 flex flex-col-reverse sm:flex-row gap-3 sm:justify-end">
          <button
            onClick={onBatal}
            disabled={isSubmitting}
            className="px-5 py-3 min-h-[48px] rounded-lg border border-outline-variant font-semibold text-secondary hover:bg-surface-container-low active:scale-95 transition-colors disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={() => submitSurvey()}
            disabled={terkunci}
            className={`flex items-center justify-center px-6 py-3 min-h-[48px] rounded-lg font-semibold shadow-sm transition-all
              ${
                terkunci
                  ? 'bg-surface-dim text-secondary cursor-not-allowed border border-outline-variant'
                  : 'bg-primary text-white hover:bg-primary-hover shadow-primary/20 active:scale-95 border border-transparent'
              }
            `}
          >
            {isSubmitting ? 'Mengirim...' : 'Kirim Survei'}
            {!isSubmitting && <Send className="ml-2 w-5 h-5 shrink-0" />}
          </button>
        </div>
      </div>
    </div>
  );
}
