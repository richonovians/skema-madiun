import React from 'react';
import Link from 'next/link';
import { Smile, Globe, AtSign, MapPin, Phone, Mail } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="w-full py-16 bg-[#0F172A] text-white">
      <div className="max-w-[1280px] mx-auto px-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
        {/* Brand & Info */}
        <div className="flex flex-col gap-6">
          <span className="font-h2 text-h2 text-white">SKEMA Madiun</span>
          <p className="text-outline-variant font-body text-body-md">
            Layanan aspirasi dan pengaduan online rakyat Kabupaten Madiun. Terpercaya, transparan, dan akuntabel.
          </p>
          <div className="flex gap-4 mt-2">
            <a href="#" className="p-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors">
              <Smile size={20} />
            </a>
            <a href="#" className="p-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors">
              <Globe size={20} />
            </a>
            <a href="#" className="p-2 border border-white/20 rounded-full hover:bg-white/10 transition-colors">
              <AtSign size={20} />
            </a>
          </div>
        </div>
        
        {/* Links 1 */}
        <div className="flex flex-col gap-4">
          <h4 className="font-bold text-lg mb-1">Tautan Cepat</h4>
          <Link className="text-outline-variant hover:text-white hover:underline transition-all duration-300" href="/">Beranda</Link>
          <Link className="text-outline-variant hover:text-white hover:underline transition-all duration-300" href="#">Statistik Pelayanan</Link>
          <Link className="text-outline-variant hover:text-white hover:underline transition-all duration-300" href="#">Daftar OPD</Link>
          <Link className="text-outline-variant hover:text-white hover:underline transition-all duration-300" href="#">Bantuan</Link>
        </div>
        
        {/* Links 2 */}
        <div className="flex flex-col gap-4">
          <h4 className="font-bold text-lg mb-1">Legalitas</h4>
          <Link className="text-outline-variant hover:text-white hover:underline transition-all duration-300" href="#">Kebijakan Privasi</Link>
          <Link className="text-outline-variant hover:text-white hover:underline transition-all duration-300" href="#">Syarat &amp; Ketentuan</Link>
          <Link className="text-outline-variant hover:text-white hover:underline transition-all duration-300" href="#">Kontak Kami</Link>
        </div>
        
        {/* Contact */}
        <div className="flex flex-col gap-4">
          <h4 className="font-bold text-lg mb-1">Hubungi Kami</h4>
          <div className="flex gap-2 items-start">
            <MapPin className="text-outline-variant shrink-0 mt-1" size={18} />
            <p className="text-outline-variant text-sm">Jl. Alun-Alun Utara No. 1, Kota Madiun, Jawa Timur</p>
          </div>
          <div className="flex gap-2 items-center">
            <Phone className="text-outline-variant shrink-0" size={18} />
            <p className="text-outline-variant text-sm">(0351) 464xxx</p>
          </div>
          <div className="flex gap-2 items-center">
            <Mail className="text-outline-variant shrink-0" size={18} />
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
