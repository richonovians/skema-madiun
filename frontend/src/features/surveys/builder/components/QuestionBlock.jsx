import React from 'react';
import { Lock, GripVertical, Trash2, Copy, Settings } from 'lucide-react';

export default function QuestionBlock({ question, onDelete, onUpdate }) {
  const isBaku = question.isBaku;

  if (isBaku) {
    return (
      <div className="bg-surface-container-low border border-border rounded-xl p-lg relative overflow-hidden opacity-90 mb-lg">
        <div className="absolute top-0 left-0 w-1 h-full bg-outline"></div>
        <div className="flex justify-between items-start mb-md">
          <div className="flex items-center gap-sm">
            <Lock className="text-text-secondary" size={18} />
            <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wide">
              {question.title}
            </h4>
          </div>
          <span className="px-2 py-1 bg-surface-variant text-[10px] font-bold rounded-full text-on-surface-variant">
            TEMPLATE BAKU
          </span>
        </div>
        <div className="mb-md">
          <textarea 
            className="w-full bg-white/50 border border-border rounded-lg p-md text-body-md font-body-md resize-none focus:ring-0" 
            readOnly
            value={question.text}
            rows={2}
          />
        </div>
        <div className="flex items-center gap-md">
          <div className="flex items-center gap-2">
            <input 
              checked 
              className="rounded border-border text-primary focus:ring-0" 
              disabled 
              type="checkbox"
            />
            <label className="text-xs font-medium text-text-secondary">Hitung ke perhitungan Nilai IKM</label>
          </div>
          <div className="h-4 w-px bg-border"></div>
          <span className="text-xs text-text-secondary">Tipe: {question.type}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border-2 border-primary rounded-xl p-lg relative shadow-2xl transform scale-[1.02] transition-all mb-lg">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-on-primary px-sm py-xs rounded-full flex items-center gap-1 cursor-grab active:cursor-grabbing">
        <GripVertical size={16} />
        <span className="text-[10px] font-bold">FOKUS</span>
      </div>
      
      <div className="flex justify-between items-start mb-md">
        <div className="flex-1 mr-xl">
          <label className="block text-xs font-bold text-primary mb-xs uppercase">{question.title}</label>
          <input 
            className="w-full text-headline-md font-headline-md border-none focus:ring-0 p-0 text-text-primary" 
            placeholder="Tulis pertanyaan di sini..." 
            type="text" 
            value={question.text}
            onChange={(e) => onUpdate(question.id, { text: e.target.value })}
          />
        </div>
        <button 
          onClick={() => onDelete(question.id)}
          className="text-error hover:bg-error-container p-sm rounded-lg transition-colors" 
          title="Hapus Pertanyaan"
        >
          <Trash2 size={20} />
        </button>
      </div>
      
      <div className="grid grid-cols-2 gap-lg mb-xl">
        <div className="flex flex-col gap-xs">
          <label className="text-[10px] font-bold text-text-secondary uppercase">Tipe Input</label>
          <select 
            className="w-full rounded-lg border-border focus:border-primary focus:ring-primary-container/20 font-label-md text-label-md py-sm"
            value={question.type}
            onChange={(e) => onUpdate(question.id, { type: e.target.value })}
          >
            <option value="Skala Penilaian 1-4">Skala Penilaian 1-4</option>
            <option value="Pilihan Ganda">Pilihan Ganda</option>
            <option value="Isian Teks">Isian Teks</option>
          </select>
        </div>
        <div className="flex flex-col gap-xs">
          <label className="text-[10px] font-bold text-text-secondary uppercase">Label Pilihan</label>
          <div className="flex items-center gap-sm mt-1">
            <div className="flex-1 h-2 bg-surface-container rounded-full overflow-hidden flex">
              <div className="h-full bg-error w-1/4"></div>
              <div className="h-full bg-tertiary w-1/4"></div>
              <div className="h-full bg-primary-fixed-dim w-1/4"></div>
              <div className="h-full bg-primary w-1/4"></div>
            </div>
            <span className="text-xs font-medium text-text-secondary">4 Opsi</span>
          </div>
        </div>
      </div>
      
      <div className="flex items-center justify-between pt-md border-t border-border">
        <div className="flex items-center gap-md">
          <label className="relative inline-flex items-center cursor-pointer">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={question.isRequired}
              onChange={(e) => onUpdate(question.id, { isRequired: e.target.checked })}
            />
            <div className="w-9 h-5 bg-surface-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary"></div>
            <span className="ms-3 text-xs font-medium text-text-secondary">Wajib Diisi</span>
          </label>
        </div>
        <div className="flex gap-sm">
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-primary transition-colors">
            <Copy size={16} />
          </button>
          <button className="w-8 h-8 flex items-center justify-center rounded-lg border border-border text-text-secondary hover:text-primary transition-colors">
            <Settings size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
