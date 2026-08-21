import React from 'react';
import Button from '@/components/ui/Button';

export default function ExitConfirmationModal({ isOpen, onConfirm, onCancel }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      {/* `minWidth: 320px` DIBUANG (2026-08-20): dipadu `margin: 0 16px` ia
          menuntut 352px, sehingga di ponsel 320px (mis. iPhone SE generasi awal)
          modal melebihi lebar layar dan halaman ikut bisa digeser ke samping.
          Jarak tepi kini dari `p-4` induknya, jadi lebarnya benar-benar mengikuti
          layar. Gaya inline diganti kelas Tailwind sekalian -- tak ada alasan
          nilai ini ditulis inline. */}
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-[380px]">
        <div className="p-6 md:p-8 text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          </div>
          
          <h3 className="text-xl font-bold text-text-primary">
            Keluar dari Pengisian Survei?
          </h3>
          
          <p className="text-sm text-text-secondary leading-relaxed">
            Jawaban yang belum dikirim mungkin tidak akan tersimpan. Apakah Anda yakin ingin meninggalkan halaman ini?
          </p>
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex flex-col gap-2">
          <Button variant="primary" onClick={onCancel} className="w-full">
            Lanjutkan Mengisi
          </Button>
          <Button variant="secondary" onClick={onConfirm} className="w-full text-red-600 border-red-200 hover:!bg-red-600 hover:!text-white hover:!border-red-600">
            Keluar dari Survei
          </Button>
        </div>
      </div>
    </div>
  );
}
