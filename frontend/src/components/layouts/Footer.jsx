import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Globe, AtSign, MapPin, Phone, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full py-16 bg-[#0F172A] text-white">
      <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-12">
        {/* Brand & Info (Sejajar Horizontal antara Logo dan Keterangan) */}
        <div className="flex flex-col sm:flex-row items-start gap-5 col-span-1 md:col-span-2 lg:col-span-6">
          {/* Logo di Kiri */}
          <div className="shrink-0 flex items-center justify-center">
            <Image 
              src="/images/footer/Kabupaten-Madiun-Logo-transparent.png" 
              alt="Logo Kabupaten Madiun" 
              width={800}
              height={917}
              className="object-contain w-auto h-32 sm:h-40 md:h-48 lg:h-56 drop-shadow-lg"
            />
          </div>
          
          {/* Judul, Keterangan, dan Ikon di Kanan */}
          <div className="flex flex-col gap-3 flex-1">
            <span className="font-h2 text-2xl md:text-3xl font-bold text-white tracking-wide leading-tight">SKEMA Madiun</span>
            <p className="text-outline-variant font-body text-sm sm:text-base leading-relaxed text-slate-300">
              Layanan aspirasi dan pengaduan online rakyat Kabupaten Madiun. Terpercaya, transparan, dan akuntabel.
            </p>
            <div className="flex gap-3 mt-2">
              <a href="#" className="p-2.5 bg-white/5 border border-white/15 rounded-xl hover:bg-white/15 hover:border-white/30 hover:scale-105 transition-all duration-200">
                <Globe size={18} className="text-white" />
              </a>
              <a href="#" className="p-2.5 bg-white/5 border border-white/15 rounded-xl hover:bg-white/15 hover:border-white/30 hover:scale-105 transition-all duration-200">
                <AtSign size={18} className="text-white" />
              </a>
            </div>
          </div>
        </div>
        
        {/* Links */}
        <div className="flex flex-col gap-3.5 col-span-1 lg:col-span-3 lg:pl-6">
          <h4 className="font-bold text-lg text-white mb-1">Tautan Cepat</h4>
          <Link className="text-outline-variant hover:text-white hover:translate-x-1 transition-all duration-200 inline-block w-fit" href="/">Beranda</Link>
          <Link className="text-outline-variant hover:text-white hover:translate-x-1 transition-all duration-200 inline-block w-fit" href="/statistics">Statistik Pelayanan</Link>
          <Link className="text-outline-variant hover:text-white hover:translate-x-1 transition-all duration-200 inline-block w-fit" href="/about#faq">Bantuan</Link>
        </div>
        
        {/* Contact */}
        <div className="flex flex-col gap-3.5 col-span-1 lg:col-span-3">
          <h4 className="font-bold text-lg text-white mb-1">Hubungi Kami</h4>
          <div className="flex gap-3 items-start">
            <MapPin className="text-primary shrink-0 mt-0.5" size={18} />
            <p className="text-outline-variant text-sm leading-relaxed">Jl. Alun-Alun Utara No. 4, Mejayan, Kab. Madiun, Jawa Timur 63153</p>
          </div>
          <div className="flex gap-3 items-center">
            <Phone className="text-primary shrink-0" size={18} />
            <p className="text-outline-variant text-sm font-mono">(0351) 464xxx</p>
          </div>
          <div className="flex gap-3 items-center">
            <Mail className="text-primary shrink-0" size={18} />
            <p className="text-outline-variant text-sm">hubungi@madiunkab.go.id</p>
          </div>
        </div>
      </div>
      <div className="max-w-[1280px] mx-auto px-6 mt-16 pt-6 border-t border-white/10 text-center">
        <p className="text-outline-variant text-sm">© {new Date().getFullYear()} SKEMA Madiun. Seluruh Hak Cipta Dilindungi.</p>
      </div>
    </footer>
  );
}
