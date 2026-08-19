import React from 'react';
import { Lock, GripVertical, Trash2 } from 'lucide-react';

const SCALE_STEPS = [1, 2, 3, 4];

/**
 * Pratinjau bentuk jawaban sesuai tipe pertanyaan -- read-only, sekadar
 * memperlihatkan apa yang akan dilihat responden (lihat QuestionCard.jsx yang
 * merender versi sungguhannya). Sebelum ini blok pertanyaan hanya menampilkan
 * nama tipe sebagai teks, sehingga "Pilihan Ganda" & "Uraian" tak terlihat
 * bedanya sama sekali di kanvas builder.
 */
function AnswerPreview({ type, options }) {
  if (type === 'Isian Teks') {
    return (
      <div className="rounded-lg border border-dashed border-border bg-surface-container-low px-md py-sm text-xs text-text-secondary italic">
        Responden mengisi jawaban bebas di sini (tidak wajib).
      </div>
    );
  }

  if (type === 'Pilihan Ganda') {
    if (options.length === 0) {
      return (
        <div className="rounded-lg border border-dashed border-border bg-surface-container-low px-md py-sm text-xs text-text-secondary italic">
          Opsi jawaban tidak ditemukan.
        </div>
      );
    }
    return (
      <div className="flex flex-col gap-xs">
        {options.map((option, index) => (
          <div key={option.id} className="flex items-center gap-sm text-xs text-text-secondary">
            <span className="w-5 h-5 shrink-0 rounded-full border border-border flex items-center justify-center text-[10px] font-bold">
              {String.fromCharCode(65 + index)}
            </span>
            <span className="truncate">{option.label}</span>
          </div>
        ))}
      </div>
    );
  }

  // Skala 1-4 (termasuk seluruh unsur baku PermenPANRB 14/2017).
  return (
    <div className="flex items-center gap-xs">
      {SCALE_STEPS.map((step) => (
        <span
          key={step}
          className="w-7 h-7 rounded-full border border-border flex items-center justify-center text-[11px] font-bold text-text-secondary"
        >
          {step}
        </span>
      ))}
      <span className="ml-sm text-xs text-text-secondary">1 = terburuk, 4 = terbaik</span>
    </div>
  );
}

export default function QuestionBlock({ question, onDelete, onUpdate, onTextCommit }) {
  const isBaku = question.isBaku;
  const options = question.options ?? [];

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
        <div className="mb-md">
          <AnswerPreview type={question.type} options={options} />
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
            onBlur={(e) => onTextCommit && onTextCommit(question.id, e.target.value)}
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

      <div className="mb-xl flex flex-col gap-md">
        <div className="flex flex-col gap-xs max-w-[240px]">
          {/* Tipe HANYA bisa dipilih saat menambah (lihat BuilderSidebar.jsx) --
              backend (UpdateQuestionDto) tak dukung ubah tipe pertanyaan yang
              sudah dibuat, jadi read-only di sini, bukan interaktif semu. */}
          <label className="text-[10px] font-bold text-text-secondary uppercase">Tipe Input</label>
          <div className="w-full rounded-lg border border-border bg-surface-container-low font-label-md text-label-md py-sm px-sm text-text-secondary">
            {question.type}
          </div>
        </div>

        <AnswerPreview type={question.type} options={options} />

        {question.type === 'Pilihan Ganda' && (
          <p className="text-[11px] text-text-secondary italic">
            Opsi jawaban tidak dapat diubah setelah pertanyaan dibuat -- hapus lalu buat ulang bila
            perlu diperbaiki.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-md border-t border-border">
        <div className="flex items-center gap-md">
          {/* Wajib-diisi DIDERIVASI dari tipe (skala/pilihan selalu wajib, teks
              selalu opsional) -- backend tak punya flag wajib terpisah yg bisa
              diubah per pertanyaan, jadi read-only, bukan toggle sungguhan. */}
          <span className="text-xs font-medium text-text-secondary">
            {question.isRequired ? '✓ Wajib diisi' : 'Opsional (isian teks)'}
          </span>
        </div>
      </div>
    </div>
  );
}
