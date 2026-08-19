'use client';

import React, { useEffect, useState } from 'react';
import { X, Plus, Trash2, Loader2, ListChecks, Info } from 'lucide-react';

// Batas dari CreateQuestionDto backend: @ArrayMinSize(2) @ArrayMaxSize(20),
// label @MaxLength(255). Ditegakkan juga di sini supaya penolakan terjadi
// sebelum permintaan terkirim, bukan sebagai 400 yang membingungkan.
const MIN_OPTIONS = 2;
const MAX_OPTIONS = 20;
const MAX_OPTION_LENGTH = 255;

/**
 * Form tambah pertanyaan "Pilihan Ganda" beserta opsi jawabannya.
 *
 * KENAPA opsi dikumpulkan LEBIH DULU dalam satu modal, bukan diisi belakangan
 * di blok pertanyaan seperti tipe lain: kontrak backend tak memberi pilihan.
 * `POST /surveys/:id/questions` WAJIB menerima >=2 opsi untuk tipe `pilihan`
 * (QuestionsService.assertValidOptionsForType), sementara `PATCH /questions/:id`
 * (UpdateQuestionDto) cuma menerima `teks`/`isIkmUnsur`/`kodeUnsur` -- opsi
 * tidak dapat ditambah atau diubah setelah pertanyaan dibuat. Jadi pertanyaan
 * hanya boleh dikirim setelah opsinya lengkap.
 *
 * Sebelum ini tombol "Pilihan Ganda" di BuilderSidebar hanya memunculkan pesan
 * error "belum didukung builder ini" -- tipe itu praktis tak bisa dipakai.
 *
 * TAK punya prop `isOpen`: pemanggil merender komponen ini hanya saat modal
 * perlu tampil, sehingga isian selalu segar tanpa reset dari dalam useEffect
 * (pola itu memicu cascading render, lihat react-hooks/set-state-in-effect).
 */
export default function QuestionOptionsModal({
  isSubmitting = false,
  submitError = null,
  onSubmit,
  onCancel,
}) {
  const [text, setText] = useState('');
  const [options, setOptions] = useState(['', '']); // dua baris kosong = minimum backend
  const [validationError, setValidationError] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape' && !isSubmitting) onCancel?.();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isSubmitting, onCancel]);

  // Kunci scroll kanvas builder di belakang modal (pola sama SurveyFormModal).
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const handleOptionChange = (index, value) => {
    setOptions((prev) => prev.map((opt, i) => (i === index ? value : opt)));
  };

  const handleAddOption = () => {
    setOptions((prev) => (prev.length >= MAX_OPTIONS ? prev : [...prev, '']));
  };

  const handleRemoveOption = (index) => {
    // Dua baris terakhir tak boleh dihapus -- backend menolak <2 opsi.
    setOptions((prev) => (prev.length <= MIN_OPTIONS ? prev : prev.filter((_, i) => i !== index)));
  };

  const handleSubmit = () => {
    const trimmedText = text.trim();
    if (!trimmedText) {
      setValidationError('Teks pertanyaan wajib diisi.');
      return;
    }

    const filledOptions = options.map((opt) => opt.trim()).filter(Boolean);
    if (filledOptions.length < MIN_OPTIONS) {
      setValidationError(`Isi minimal ${MIN_OPTIONS} opsi jawaban.`);
      return;
    }
    if (new Set(filledOptions.map((opt) => opt.toLowerCase())).size !== filledOptions.length) {
      setValidationError('Ada opsi jawaban yang sama -- setiap opsi harus berbeda.');
      return;
    }

    setValidationError(null);
    // Baris yang dibiarkan kosong sengaja dibuang, bukan dianggap error:
    // pengguna bisa menambah baris lalu berubah pikiran.
    onSubmit({ text: trimmedText, options: filledOptions });
  };

  const error = validationError ?? submitError;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && !isSubmitting && onCancel?.()}
    >
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200 w-full max-w-[520px] max-h-[90vh] flex flex-col">
        <div className="px-6 pt-6 pb-4 border-b border-slate-100 relative shrink-0">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            <X size={18} />
          </button>

          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Pertanyaan Kustom
          </p>
          <h3 className="font-bold text-slate-800 text-lg leading-tight mt-1 flex items-center gap-2">
            <ListChecks size={18} className="text-primary" />
            Pilihan Ganda
          </h3>
          <p className="text-sm text-slate-500 mt-1">
            Responden memilih satu opsi. Pertanyaan ini tidak dihitung ke Nilai IKM (rumus IKM
            hanya memakai pertanyaan skala 1-4).
          </p>
        </div>

        <div className="px-6 py-5 space-y-4 flex-1 min-h-0 overflow-y-auto">
          <div className="space-y-xs">
            <label htmlFor="pilihan-teks" className="block text-sm font-bold text-text-primary">
              Teks Pertanyaan
            </label>
            <textarea
              id="pilihan-teks"
              rows={2}
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={isSubmitting}
              placeholder="mis. Dari mana Anda mengetahui layanan ini?"
              className="w-full p-md border border-outline-variant rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md resize-none disabled:opacity-60"
            />
          </div>

          <div className="space-y-xs">
            <div className="flex items-center justify-between">
              <span className="block text-sm font-bold text-text-primary">Opsi Jawaban</span>
              <span className="text-xs text-slate-400 font-medium">
                {options.length} / {MAX_OPTIONS}
              </span>
            </div>

            <div className="space-y-2">
              {options.map((option, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="w-7 h-7 shrink-0 rounded-full border border-outline-variant flex items-center justify-center text-xs font-bold text-text-secondary">
                    {String.fromCharCode(65 + index)}
                  </span>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => handleOptionChange(index, e.target.value)}
                    disabled={isSubmitting}
                    maxLength={MAX_OPTION_LENGTH}
                    placeholder={`Opsi ${index + 1}`}
                    className="flex-1 min-w-0 min-h-[44px] px-3 border border-outline-variant rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md disabled:opacity-60"
                  />
                  <button
                    onClick={() => handleRemoveOption(index)}
                    disabled={isSubmitting || options.length <= MIN_OPTIONS}
                    title={
                      options.length <= MIN_OPTIONS
                        ? `Minimal ${MIN_OPTIONS} opsi`
                        : 'Hapus opsi ini'
                    }
                    className="shrink-0 w-9 h-9 flex items-center justify-center rounded-lg border border-outline-variant text-text-secondary hover:text-error hover:border-error/40 hover:bg-error-container transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-text-secondary disabled:hover:border-outline-variant"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleAddOption}
              disabled={isSubmitting || options.length >= MAX_OPTIONS}
              className="mt-2 w-full py-2.5 rounded-lg border-2 border-dashed border-outline-variant text-sm font-semibold text-text-secondary hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Plus size={16} />
              Tambah Opsi
            </button>
          </div>

          <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <Info size={15} className="text-blue-500 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700 font-medium leading-relaxed">
              Opsi jawaban tidak dapat diubah setelah pertanyaan dibuat. Untuk mengubahnya, hapus
              pertanyaan ini lalu buat ulang.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 pb-6 pt-4 flex flex-col sm:flex-row gap-2 sm:gap-3 shrink-0 border-t border-slate-100">
          <button
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-all disabled:opacity-50"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="flex-1 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-primary hover:bg-primary-hover shadow-md shadow-primary/20 transition-all active:scale-[0.98] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {isSubmitting ? 'Menambahkan...' : 'Tambah Pertanyaan'}
          </button>
        </div>
      </div>
    </div>
  );
}
