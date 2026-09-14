'use client';

import React, { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import KartuStatistikHero from './KartuStatistikHero';
import SSOLoginButton from '@/features/authentication/components/SSOLoginButton';
import {
  isAuthenticated,
  SESSION_CHANGED_EVENT,
} from '@/features/authentication/services/authStorage';


/**
 * Ilustrasi jendela peramban, digambar dari elemen biasa (14 September 2026).
 *
 * TANPA berkas gambar dan tanpa alamat luar, atas permintaan pengguna. Alasannya
 * bukan sekadar selera: halaman utama yang menarik berkas dari CDN ikut
 * menggantungkan tampilannya pada layanan di luar kendali Diskominfo, dan
 * membocorkan kunjungan setiap warga ke pihak ketiga. Kotak-kotak di bawah ini
 * hanyalah div berwarna, jadi tak ada permintaan keluar sama sekali.
 *
 * Disembunyikan di bawah `lg`. Di ponsel ia hanya memanjangkan hero sebelum
 * kalimat pembukanya terbaca.
 */
function IlustrasiJendela() {
  return (
    <div className="relative">
      {/* Bola gradasi di belakang tumpukan, memberi kedalaman seperti pada
          referensi. Murni `radial-gradient` -- tak ada berkas gambar dan tak ada
          alamat luar sama sekali. `blur` besar membuat tepinya larut, jadi ia
          tak pernah bersaing dengan kartu di depannya. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-24 -z-10 hidden blur-[64px] lg:block"
        style={{
          background:
            'radial-gradient(42% 46% at 70% 26%, rgba(99,102,241,0.62) 0%, rgba(99,102,241,0) 70%),' +
            'radial-gradient(38% 42% at 28% 64%, rgba(0,74,198,0.5) 0%, rgba(0,74,198,0) 72%),' +
            'radial-gradient(34% 36% at 66% 82%, rgba(217,70,239,0.42) 0%, rgba(217,70,239,0) 70%),' +
            'radial-gradient(26% 30% at 86% 58%, rgba(244,114,182,0.3) 0%, rgba(244,114,182,0) 72%)',
        }}
      />

      {/* Rangkanya hiasan belaka -- membacakan selusin kotak kosong tak memberi
          apa pun kepada pengguna pembaca layar. Kartu statusnya SENGAJA berada
          di luar pembungkus ini: isinya pernyataan sungguhan tentang layanan
          ini, jadi ia justru harus terbaca. */}
      <div
        data-rangka-ilustrasi
        aria-hidden="true"
        className="hidden rounded-[28px] border border-slate-200/80 bg-white p-3 shadow-[0_24px_60px_rgba(15,23,42,0.10)] lg:block"
      >
        <div className="flex items-center gap-1.5 px-3 py-2.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        </div>

        <div className="rounded-[20px] border border-slate-100 bg-slate-50/60 p-4">
          <div className="mb-4 h-7 w-1/2 rounded-lg bg-slate-200/70" />

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 flex h-40 items-center justify-center rounded-2xl bg-blue-50">
              <FileText size={38} className="text-primary/45" />
            </div>
            <div className="h-40 rounded-2xl bg-slate-100" />
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="h-14 rounded-2xl bg-slate-100" />
            <div className="h-14 rounded-2xl bg-emerald-50" />
            <div className="h-14 rounded-2xl bg-amber-50" />
          </div>
        </div>
      </div>

      {/* Tumpukan kartunya, dua irama melayang. Lihat catatan
          `--animate-melayang` di globals.css: 6 dtk dan 7,5 dtk tak pernah
          bertemu di puncak yang sama, jadi tiap kartu terbaca sebagai lapisan
          yang berdiri sendiri. */}
      <KartuStatistikHero />
    </div>
  );
}

export default function HeroSection() {
  /**
   * Pola yang sama persis dengan Navbar, dan disengaja. `isAuthenticated()`
   * hanya bernilai di peramban; membacanya saat render pertama membuat server
   * dan klien menggambar hal berbeda, dan React melaporkan hydration failed.
   * Langganan SESSION_CHANGED_EVENT menjaga tombolnya ikut hilang ketika sesi
   * dinyatakan tak sah di tengah jalan oleh interceptor 401.
   */
  const [sudahMasuk, setSudahMasuk] = useState(false);

  useEffect(() => {
    const hitungUlang = () => setSudahMasuk(isAuthenticated());
    hitungUlang();
    window.addEventListener(SESSION_CHANGED_EVENT, hitungUlang);
    return () => window.removeEventListener(SESSION_CHANGED_EVENT, hitungUlang);
  }, []);

  return (
    <section className="relative flex min-h-[85vh] items-center overflow-hidden bg-white lg:min-h-[90vh]">
      <div className="relative z-20 mx-auto w-full max-w-[1280px] px-4 pt-8 pb-24 sm:px-6 sm:pb-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div
              className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium shadow-sm"
              style={{
                background: 'rgba(0, 74, 198, 0.08)',
                border: '1px solid rgba(0, 74, 198, 0.15)',
                color: '#004ac6',
              }}
            >
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
              Layanan Publik Terpadu Kabupaten Madiun
            </div>

            <h1
              className="animate-fade-in-up text-balance mb-4 max-w-[48rem] text-3xl leading-tight font-bold sm:text-4xl md:text-5xl lg:text-6xl"
              style={{ animationDelay: '100ms', color: '#0F172A' }}
            >
              Satu{' '}
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage: 'linear-gradient(135deg, #004ac6 0%, #6366f1 100%)',
                }}
              >
                SKEMA
              </span>{' '}
              untuk Madiun Lebih Baik
            </h1>

            <p
              className="animate-fade-in-up text-pretty max-w-[42rem] text-sm leading-relaxed md:text-base"
              style={{ animationDelay: '200ms', color: '#475569' }}
            >
              Sistem Keluhan, Evaluasi, dan Manajemen Aspirasi. Sampaikan aspirasi Anda dengan mudah
              demi mewujudkan pelayanan yang transparan dan responsif.
            </p>

            {/* Tombol masuk pindah ke sini dari navbar (14 September 2026,
                permintaan pengguna), rata kiri sejajar dengan kalimat di
                atasnya. Disembunyikan bagi yang sudah masuk: menekannya
                memanggil clearSession lebih dulu, jadi tombol yang tertinggal di
                layar orang yang sudah masuk justru membuang sesinya sendiri. */}
            {!sudahMasuk && (
              <div className="animate-fade-in-up mt-8 flex" style={{ animationDelay: '300ms' }}>
                <SSOLoginButton />
              </div>
            )}
          </div>

          <IlustrasiJendela />
        </div>
      </div>
    </section>
  );
}
