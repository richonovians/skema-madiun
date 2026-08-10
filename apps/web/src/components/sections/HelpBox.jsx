import React from 'react';
import { Info, ArrowRight } from 'lucide-react';

export default function HelpBox() {
  return (
    <div className="bg-primary-fixed p-lg rounded-xl flex flex-col gap-sm border border-primary-fixed-dim shadow-sm mt-4">
      <div className="flex items-center gap-sm text-primary">
        <Info size={20} />
        <span className="font-bold text-sm">Butuh Bantuan?</span>
      </div>
      <p className="text-sm text-on-primary-fixed-variant mb-sm">
        Pelajari tata cara menyampaikan pengaduan yang efektif melalui panduan kami.
      </p>
      <button
        onClick={() => {
          const el = document.getElementById('panduan-penggunaan');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }}
        className="bg-white text-primary py-sm px-md rounded-full font-bold text-sm hover:bg-primary-hover hover:text-white transition-all duration-300 flex items-center justify-center gap-xs border border-primary/20 hover:border-transparent hover:shadow-md w-full cursor-pointer"
      >
        Panduan Layanan
        <ArrowRight size={18} />
      </button>
    </div>
  );
}
