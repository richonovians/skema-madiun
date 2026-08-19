import React from 'react';
import { PlusCircle, GripVertical, Info } from 'lucide-react';

export default function BuilderSidebar({ onAddBaku, onAddCustom }) {
  return (
    <aside className="w-full md:w-80 shrink-0 bg-surface border-b md:border-b-0 md:border-r border-border overflow-y-auto p-4 md:p-lg flex flex-col gap-6 md:gap-xl">
      {/* Section 1: Template */}
      <section>
        <h3 className="text-label-md font-label-md text-text-secondary uppercase tracking-wider mb-md">Template Unsur Baku</h3>
        <button 
          onClick={onAddBaku}
          className="w-full bg-primary-container/10 hover:bg-primary-container/20 text-primary border-2 border-dashed border-primary-container/30 rounded-xl p-lg text-left group transition-all duration-300 active:scale-[0.98]"
        >
          <div className="flex flex-col gap-xs">
            <span className="font-headline-md text-[14px]">Tambah 9 Unsur Baku</span>
            <span className="text-xs opacity-80">PermenPANRB 14/2017</span>
          </div>
          <div className="mt-md flex justify-end">
            <PlusCircle className="group-hover:translate-x-1 transition-transform" />
          </div>
        </button>
      </section>

      {/* Section 2: Custom Elements */}
      <section>
        <h3 className="text-label-md font-label-md text-text-secondary uppercase tracking-wider mb-md">Komponen Pertanyaan Kustom</h3>
        <div className="flex flex-col gap-sm">
          <div 
            onClick={() => onAddCustom && onAddCustom('Skala Penilaian 1-4')}
            className="draggable-item group cursor-pointer active:cursor-grabbing bg-white border border-border rounded-lg p-md flex items-center gap-md hover:border-primary hover:shadow-sm transition-all"
          >
            <GripVertical className="text-text-secondary group-hover:text-primary" />
            <div className="flex flex-col">
              <span className="font-label-md text-label-md">Skala Nilai 1-4</span>
              <span className="text-[10px] text-text-secondary">Standard IKM</span>
            </div>
          </div>
          <div 
            onClick={() => onAddCustom && onAddCustom('Pilihan Ganda')}
            className="draggable-item group cursor-pointer active:cursor-grabbing bg-white border border-border rounded-lg p-md flex items-center gap-md hover:border-primary hover:shadow-sm transition-all"
          >
            <GripVertical className="text-text-secondary group-hover:text-primary" />
            <div className="flex flex-col">
              <span className="font-label-md text-label-md">Pilihan Ganda</span>
              <span className="text-[10px] text-text-secondary">Atur sendiri opsi jawabannya</span>
            </div>
          </div>
          <div
            onClick={() => onAddCustom && onAddCustom('Isian Teks')}
            className="draggable-item group cursor-pointer active:cursor-grabbing bg-white border border-border rounded-lg p-md flex items-center gap-md hover:border-primary hover:shadow-sm transition-all"
          >
            <GripVertical className="text-text-secondary group-hover:text-primary" />
            <div className="flex flex-col">
              <span className="font-label-md text-label-md">Uraian</span>
              <span className="text-[10px] text-text-secondary">Isian teks bebas, tidak wajib</span>
            </div>
          </div>
        </div>
      </section>

      {/* Section 3: Tips */}
      <div className="mt-auto p-md bg-surface-container-low rounded-xl border border-border">
        <div className="flex items-start gap-sm">
          <Info className="text-primary shrink-0" size={20} />
          {/* Teks lama menjanjikan tarik-dan-lepas, padahal seret-menyeret tak
              pernah diimplementasikan (satu-satunya cara menambah adalah klik)
              -- petunjuk yang salah membuat komponen ini disangka rusak. */}
          <p className="text-xs text-on-surface-variant leading-relaxed">
            Klik komponen di atas untuk menambahkannya ke kuesioner. Untuk Pilihan Ganda, opsi
            jawaban diisi lewat jendela yang muncul.
          </p>
        </div>
      </div>
    </aside>
  );
}
