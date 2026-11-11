'use client';

import React, { useEffect, useState } from 'react';
import KartuStatistikHero from './KartuStatistikHero';
import SSOLoginButton from '@/features/authentication/components/SSOLoginButton';
import {
  isAuthenticated,
  SESSION_CHANGED_EVENT,
} from '@/features/authentication/services/authStorage';

/**
 * Panggung kartu statistik di kolom kanan hero (10 November 2026).
 *
 * Menggantikan ilustrasi jendela peramban (14 September 2026) atas keputusan
 * pengguna, mengikuti referensi "Learning progress score": kartu Tren IKM
 * menjadi isi utama, tegak, di atas panel biru. Dasbor tiruan yang dulu
 * di sini memajang "84%" dan "< 2 Jam" -- angka karangan -- tepat di sebelah
 * angka sungguhan dari /statistics, dan pembaca tak punya cara membedakan
 * keduanya. Kemiringan 3D-nya ikut dibuang: tanpa rangka di belakangnya, ia
 * hanya membuat garis dasar teks dan batang melandai di kartu yang angkanya
 * harus dibaca.
 *
 * TANPA berkas gambar dan tanpa alamat luar, atas permintaan pengguna:
 * halaman utama yang menarik berkas dari CDN ikut menggantungkan tampilannya
 * pada layanan di luar kendali Diskominfo, dan membocorkan kunjungan setiap
 * warga ke pihak ketiga. Panelnya murni `linear-gradient`.
 */
/** Pudar mendatar dan tegak; diirisi, keduanya memudarkan keempat sisi panel. */
const MASKER_EMPAT_SISI =
  'linear-gradient(90deg, transparent 0%, #000 30%, #000 70%, transparent 100%),' +
  'linear-gradient(180deg, transparent 0%, #000 28%, #000 72%, transparent 100%)';

function PanggungStatistik() {
  return (
    <div className="relative mt-12 lg:mt-0">
      {/* PANEL BIRU di belakang kartu Tren IKM (10 November 2026), padanan
          kolom oranye referensi dalam biru brand muda (#4493CC). Ia yang membuat
          bingkai bening kartu utama terlihat -- terukur di Chrome: di atas
          cahaya radial samar sebelumnya bingkai itu lebur. Biru tua (#153969)
          diuji dan ditolak: terbaca sebagai noda bayangan dan membuat kartu
          pinggir tampak kusam.

          Kolom tegak dengan garis-garis tipis yang MEMUDAR DI KEEMPAT SISI
          (10 November 2026, pengguna memilih "contoh 2" dari tiga pratinjau
          di Chrome). Dua gradasi -- mendatar dan tegak -- diirisi lewat
          `mask-composite`, jadi setiap sisi memudar panjang (30%/28% dari
          tepinya) dan bentuknya tetap persegi seperti kolom di referensi.
          Versi sebelumnya hanya memudarkan atas-bawah; kiri-kanannya pekat lalu
          putus pendek, sehingga terbaca sebagai balok. Pratinjau elips ditolak
          karena terbaca sebagai lampu sorot, bukan kolom.

          Ukurannya 600px x (panggung + 2 x 110px); di bawah 1440px juluran
          atas-bawahnya 56px. Terukur di Chrome: `<section>` hero mulai di y=80
          dan ber-`overflow-hidden`, sedangkan pada 1024px juluran 110px membuat
          panel mulai di y=50 -- pudar atasnya terpotong dan menyisakan garis
          mendatar di bawah navbar. Pudar kiri-kanan sepanjang
          180px, jadi tepi kartu berbingkai (384px, 108px dari tepi panel) masih
          berada di dalam pudar -- birunya sudah terasa di sisi kartu, dan baru
          bening penuh 108px di luarnya. Di lebar `lg` terkecil (kolom 456px)
          panel menjulur 72px ke tiap sisi kolom; bagian itu sudah hampir
          bening, jadi tak menimpa kolom teks.

          `lg:`-saja: di ponsel kartunya bertumpuk dalam alur biasa dan
          bingkainya pun tak digambar. Hiasan belaka, jadi disembunyikan dari
          pembaca layar; kartu angkanya TIDAK. */}
      <div
        data-cahaya-latar
        data-panel-biru
        aria-hidden="true"
        className="pointer-events-none absolute -top-14 -bottom-14 left-1/2 min-[1440px]:-top-[110px] min-[1440px]:-bottom-[110px] -z-10 hidden w-[600px] -translate-x-1/2 lg:block"
        style={{
          background:
            'repeating-linear-gradient(90deg, rgba(255,255,255,0.3) 0 2px, rgba(255,255,255,0) 2px 40px),' +
            'linear-gradient(rgba(68,147,204,0.85), rgba(68,147,204,0.85))',
          maskImage: MASKER_EMPAT_SISI,
          WebkitMaskImage: MASKER_EMPAT_SISI,
          maskComposite: 'intersect',
          // Padanan `intersect` pada sintaks `-webkit-` lama.
          WebkitMaskComposite: 'source-in',
        }}
      />

      {/* Kartunya, dua irama melayang. Lihat catatan `--animate-melayang` di
          globals.css: kedua durasinya tak pernah bertemu di puncak yang sama,
          jadi tiap kartu terbaca sebagai lapisan yang berdiri sendiri. */}
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

  /*
   * `items-start lg:items-center`, BUKAN `items-center` (30 September 2026).
   *
   * Terukur di Chrome terpasang pada 393x852, dengan /statistics ditunda lalu
   * digagalkan: tinggi <section> 896px -> 724px (mentok di lantai
   * `min-h-[85vh]`) dan posisi <h1> y=170 -> y=264. Isi yang memendek sampai di
   * bawah lantai itu membuat seluruh tumpukan MEMUSAT ULANG secara tegak,
   * sehingga judul utama halaman melompat turun 94px. Yang bergeser karenanya
   * bukan kartu dekoratif di bawah, melainkan elemen yang paling mahal untuk
   * digeser.
   *
   * Memaku isinya ke atas memutus rantai itu: tinggi kolom kedua tak lagi bisa
   * menggerakkan kolom pertama, pada jalur gagal MAUPUN jalur berhasil.
   *
   * Mulai `lg` pemusatannya sengaja dipertahankan -- di sana kartu statistiknya
   * `absolute` dan tak pernah ikut menentukan tinggi, jadi tak ada yang bisa
   * bergeser.
   */
  return (
    <section className="relative flex min-h-[85vh] items-start overflow-hidden bg-white lg:min-h-[90vh] lg:items-center">
      <div className="relative z-20 mx-auto w-full max-w-[1280px] px-4 pt-8 pb-24 sm:px-6 sm:pb-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <div
              className="animate-fade-in-up mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium shadow-sm"
              style={{
                background: 'rgba(21, 57, 105, 0.08)',
                border: '1px solid rgba(21, 57, 105, 0.15)',
                color: '#153969',
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
                  backgroundImage: 'linear-gradient(135deg, #153969 0%, #2B6FA5 100%)',
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

          <PanggungStatistik />
        </div>
      </div>
    </section>
  );
}
