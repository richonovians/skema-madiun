import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Globe, MapPin, Phone, Mail } from 'lucide-react';

/**
 * Ikon Instagram digambar di sini, bukan diimpor.
 *
 * lucide-react 1.27.0 -- versi yang dipakai proyek ini -- tidak mengekspor
 * satu pun ikon merek, termasuk Instagram. Menambah pustaka ikon kedua demi
 * satu lambang terasa mahal, jadi lambangnya ditulis langsung.
 *
 * Gayanya sengaja mengikuti lucide (kotak 24, garis 2px, ujung membulat,
 * tanpa isian) supaya berdampingan rapi dengan Globe di sebelahnya. Memakai
 * lambang resmi Instagram yang berisi gradien justru akan terlihat menempel
 * sendiri di antara ikon-ikon bergaris.
 */
function IkonInstagram({ size = 18, className }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}

export default function Footer() {
  return (
    <footer className="w-full py-16 bg-[#0F172A] text-white">
      <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12">
        {/* Brand & Info (Sejajar Horizontal antara Logo dan Keterangan) */}
        <div className="flex flex-col sm:flex-row items-start gap-5 col-span-1 md:col-span-2 lg:col-span-6">
          {/* Logo di Kiri */}
          <div className="shrink-0 flex items-center justify-center">
            {/*
              `sizes` WAJIB di sini: tanpa itu next/image menganggap gambar
              dipakai sebesar `width` (800px) dan hanya menawarkan kandidat
              ~828px + ~1920px (2x) di srcset, padahal CSS di bawah cuma
              merender setinggi 128-224px (lebar ~112-196px). Akibatnya browser
              mengunduh berkas berkali-kali lebih besar dari kebutuhan, dan logo
              footer ini malah terdeteksi sebagai elemen LCP.

              Nilai di bawah = lebar render pada tiap breakpoint (tinggi x rasio
              800/917): h-32->112px, sm:h-40->140px, md:h-48->168px,
              lg:h-56->196px. Dengan ini browser memilih kandidat ~256px.

              SENGAJA TIDAK memakai `priority`/`loading="eager"` walau peringatan
              dev Next menyarankannya: logo ini ada di footer, di bawah lipatan
              layar pada seluruh halaman pemakainya (beranda, /about, /statistics,
              area responden). Memprioritaskannya justru merebut bandwidth dari
              konten atas layar -- LCP yang sah adalah logo navbar, dan itu sudah
              memakai `priority` (lihat Navbar.jsx).
            */}
            <Image
              src="/images/footer/Kabupaten-Madiun-Logo-transparent.png"
              alt="Logo Kabupaten Madiun"
              width={800}
              height={917}
              sizes="(min-width: 1024px) 196px, (min-width: 768px) 168px, (min-width: 640px) 140px, 112px"
              className="object-contain w-auto h-32 sm:h-40 md:h-48 lg:h-56 drop-shadow-lg"
            />
          </div>
          
          {/* Judul, Keterangan, dan Ikon di Kanan */}
          <div className="flex flex-col gap-3 flex-1">
            <span className="font-h2 text-2xl md:text-3xl font-bold text-white tracking-wide leading-tight">SKEMA Madiun</span>
            <p className="text-outline-variant font-body text-sm sm:text-base leading-relaxed text-slate-300">
              Layanan aspirasi dan pengaduan online rakyat Kabupaten Madiun. Terpercaya, transparan, dan akuntabel.
            </p>
            {/* DULU keduanya `href="#"` -- tautan yang tak menuju ke mana pun,
                dan isinya hanya ikon tanpa `aria-label` sehingga pembaca layar
                cuma menyebut "tautan" (pola yang sama dengan sembilan tombol
                yang dibereskan 21 September 2026).

                `rel="noopener"` wajib menyertai `target="_blank"`: tanpanya
                halaman tujuan memperoleh `window.opener` dan dapat mengarahkan
                ulang tab asalnya. `noreferrer` menutup kebocoran alamat
                perujuk sekalian. */}
            <div className="flex gap-3 mt-2">
              <a
                href="https://madiunkab.go.id/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Situs resmi Pemerintah Kabupaten Madiun"
                title="Situs resmi Pemerintah Kabupaten Madiun"
                className="p-3 bg-white/5 border border-white/15 rounded-xl hover:bg-white/15 hover:border-white/30 hover:scale-105 transition-all duration-200"
              >
                <Globe size={18} className="text-white" aria-hidden="true" />
              </a>
              <a
                href="https://www.instagram.com/pemkabmadiun/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram Pemerintah Kabupaten Madiun"
                title="Instagram Pemerintah Kabupaten Madiun"
                className="p-3 bg-white/5 border border-white/15 rounded-xl hover:bg-white/15 hover:border-white/30 hover:scale-105 transition-all duration-200"
              >
                <IkonInstagram size={18} className="text-white" />
              </a>
            </div>
          </div>
        </div>
        
        {/* Links */}
        <div className="flex flex-col gap-3.5 col-span-1 lg:col-span-3 lg:pl-6">
          <h4 className="font-bold text-lg text-white mb-1">Tautan Cepat</h4>
          <Link className="text-outline-variant hover:text-white hover:translate-x-1 transition-all duration-200 inline-flex items-center min-h-[44px] w-fit" href="/">Beranda</Link>
          <Link className="text-outline-variant hover:text-white hover:translate-x-1 transition-all duration-200 inline-flex items-center min-h-[44px] w-fit" href="/statistics">Statistik Pelayanan</Link>
          <Link className="text-outline-variant hover:text-white hover:translate-x-1 transition-all duration-200 inline-flex items-center min-h-[44px] w-fit" href="/about#faq">Bantuan</Link>
        </div>
        
        {/* Contact */}
        <div className="flex flex-col gap-3.5 col-span-1 lg:col-span-3">
          <h4 className="font-bold text-lg text-white mb-1">Hubungi Kami</h4>
          <div className="flex gap-3 items-start">
            <MapPin className="text-primary shrink-0 mt-0.5" size={18} />
            <p className="text-outline-variant text-sm leading-relaxed">Jl. Mastrip No. 23 Madiun</p>
          </div>
          <div className="flex gap-3 items-center">
            <Phone className="text-primary shrink-0" size={18} />
            <p className="text-outline-variant text-sm font-mono">(0351) 462927</p>
          </div>
          <div className="flex gap-3 items-center">
            <Mail className="text-primary shrink-0" size={18} />
            <p className="text-outline-variant text-sm">diskominfo@madiunkab.go.id</p>
          </div>
        </div>
      </div>
      <div className="max-w-[1280px] mx-auto px-6 mt-16 pt-6 border-t border-white/10 text-center">
        <p className="text-outline-variant text-sm">© {new Date().getFullYear()} SKEMA Madiun. Seluruh Hak Cipta Dilindungi.</p>
      </div>
    </footer>
  );
}
