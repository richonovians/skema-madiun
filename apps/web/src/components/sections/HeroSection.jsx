'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, Activity, PieChart, TrendingUp, Users } from 'lucide-react';
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
    /* Efek kedalamannya `lg:`-saja (16 September 2026). Sebelumnya dipasang
       lewat `style` sebaris, jadi berlaku di setiap lebar -- dan sejak kartu
       statistik ikut hidup di ponsel sebagai tumpukan dalam alur biasa,
       ketiganya ikut termiringkan. Terukur pada 393px: lebar kotak pembatas
       tumpukan berubah-ubah 358-367px alih-alih tetap 361px, tanda kotaknya
       memang terputar. Rangka ilustrasi yang dinaungi efek ini sendiri
       `hidden lg:block`, jadi mengurungnya ke `lg` mempertahankan maksud
       aslinya. Sudut putarannya tidak diubah sedikit pun.

       `lg:scale-95` DIBUANG, bukan dipindahkan: `style` sebaris selalu
       mengalahkan kelas, jadi selama ini ia tak pernah berlaku sama sekali.
       Menghidupkannya sekarang justru akan mengubah tampilan desktop. */
    <div
      data-ilustrasi-3d
      className="relative mt-12 origin-center lg:mt-16 xl:origin-right lg:[transform:perspective(1200px)_rotateX(4deg)_rotateY(-12deg)_rotateZ(2deg)] lg:[transform-style:preserve-3d]"
    >
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
        className="hidden overflow-hidden rounded-[28px] border border-slate-200/80 bg-white shadow-[0_24px_60px_rgba(15,23,42,0.10)] lg:block"
      >
        {/* Browser header */}
        <div className="flex items-center border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-full bg-red-400" />
            <span className="h-3 w-3 rounded-full bg-amber-400" />
            <span className="h-3 w-3 rounded-full bg-emerald-400" />
          </div>
          <div className="mx-auto flex h-6 w-1/2 items-center justify-center rounded-md bg-white px-3 shadow-sm ring-1 ring-slate-200/50">
            <span className="text-[10px] font-medium text-slate-400">skema.madiunkab.go.id</span>
          </div>
        </div>

        {/* Dashboard Content Mock */}
        <div className="relative bg-slate-50/30 p-5">
          {/* Header Dashboard Mock */}
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Ringkasan Eksekutif</h3>
              <p className="text-[11px] text-slate-500">Performa Layanan Publik Hari Ini</p>
            </div>
            <div className="flex gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <Activity size={14} className="text-primary" />
              </span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100">
                <Users size={14} className="text-indigo-600" />
              </span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {/* Main Chart Mock */}
            <div className="col-span-2 overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">Grafik Kepuasan</span>
                <BarChart3 size={16} className="text-slate-400" />
              </div>
              <div className="flex h-32 items-end justify-between gap-2">
                {[40, 70, 45, 90, 65, 85, 100].map((h, i) => (
                  <div key={i} className="group relative w-full rounded-t-sm bg-primary/10">
                    <div
                      className="absolute bottom-0 w-full rounded-t-sm bg-gradient-to-t from-primary/80 to-indigo-500 transition-all duration-500"
                      style={{ height: `${h}%` }}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Side Metric Mock */}
            <div className="flex flex-col gap-4">
              <div className="flex-1 rounded-2xl border border-slate-100 bg-gradient-to-br from-indigo-50 to-white p-4 shadow-sm">
                <span className="text-xs font-semibold text-indigo-800">Partisipasi</span>
                <div className="mt-2 text-2xl font-black tracking-tight text-indigo-950">84%</div>
                <div className="mt-1 flex items-center gap-1 text-[10px] font-medium text-emerald-600">
                  <TrendingUp size={12} />
                  <span>+12% dr bulan lalu</span>
                </div>
              </div>
              <div className="relative flex-1 overflow-hidden rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <div className="absolute -right-4 -top-4 opacity-5">
                  <PieChart size={64} />
                </div>
                <span className="text-xs font-semibold text-slate-600">Respon Cepat</span>
                <div className="mt-2 text-xl font-bold text-slate-800">&lt; 2 Jam</div>
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-emerald-100/50" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-16 rounded bg-slate-200" />
                <div className="h-2 w-10 rounded bg-slate-100" />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-amber-100/50" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-16 rounded bg-slate-200" />
                <div className="h-2 w-10 rounded bg-slate-100" />
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
              <div className="h-10 w-10 rounded-xl bg-blue-100/50" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-16 rounded bg-slate-200" />
                <div className="h-2 w-10 rounded bg-slate-100" />
              </div>
            </div>
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
