import React from 'react';
import Link from 'next/link';

export default function DashboardFooter() {
  return (
    <footer className="w-full py-8 px-6 bg-[#0F172A] text-white mt-8">
      <div className="max-w-[1280px] mx-auto space-y-8 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
          <div className="text-xl font-bold text-white">SKEMA Madiun</div>
          <div className="flex flex-wrap gap-6 text-outline-variant font-body text-base">
            <Link href="#" className="hover:text-white transition-colors hover:underline">Kebijakan Privasi</Link>
            <Link href="#" className="hover:text-white transition-colors hover:underline">Syarat &amp; Ketentuan</Link>
            <Link href="#" className="hover:text-white transition-colors hover:underline">Kontak Kami</Link>
            <Link href="#" className="hover:text-white transition-colors hover:underline">Peta Situs</Link>
          </div>
        </div>
        <div className="border-t border-outline-variant/20 pt-6 text-center">
          <p className="text-outline-variant text-sm font-body text-white">© 2026 Pemerintah Kabupaten Madiun. Seluruh Hak Cipta Dilindungi.</p>
        </div>
      </div>
    </footer>
  );
}
