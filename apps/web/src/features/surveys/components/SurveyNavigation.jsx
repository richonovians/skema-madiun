'use client';

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Send, ClipboardCheck } from 'lucide-react';
import ConsentRequiredAction, {
  KODE_PERSETUJUAN_DIBUTUHKAN,
} from '@/features/authentication/components/ConsentRequiredAction';
import ModalKirimSurvei from './ModalKirimSurvei';
import useSurveyStore from '../store/useSurveyStore';

export default function SurveyNavigation() {
  const {
    currentStepIndex,
    surveyData,
    answers,
    nextStep,
    prevStep,
    submitSurvey,
    isSubmitting,
    submitError,
    submitErrorCode,
    isAnonimMode,
  } = useSurveyStore();

  const [modalTerbuka, setModalTerbuka] = useState(false);

  if (!surveyData || !surveyData.questions) return null;

  const currentQuestion = surveyData.questions[currentStepIndex];
  const totalQuestions = surveyData.questions.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalQuestions - 1;

  // Pertanyaan tipe teks/uraian OPSIONAL -- ResponsesService.validateAnswers
  // hanya mewajibkan tipe skala & pilihan. Sebelumnya tombol "Selanjutnya"
  // dikunci utk semua tipe, sehingga satu pertanyaan uraian yang dilewati
  // membuat responden mentok tak bisa menyelesaikan survei.
  const isOptional = currentQuestion.type === 'text';
  const hasAnswer = String(answers[currentQuestion.id] ?? '').trim() !== '';
  const isNextDisabled = isSubmitting || (!isOptional && !hasAnswer);

  /**
   * Jalur TANPA AKUN berhenti dulu di modal verifikasi (14 September 2026, atas
   * permintaan pengguna): tombolnya berbunyi "Selesaikan" dan pengirimannya
   * baru terjadi dari dalam modal, sesudah captcha diselesaikan.
   *
   * Jalur berlogin tak ikut berubah. Captcha memang tak pernah berlaku baginya,
   * jadi modal di sana hanya akan menjadi satu klik tambahan tanpa isi.
   */
  const lewatModal = isLastStep && isAnonimMode;

  const handleNextOrSubmit = async () => {
    if (lewatModal) {
      setModalTerbuka(true);
    } else if (isLastStep) {
      await submitSurvey();
    } else {
      nextStep();
    }
  };

  const labelPanjang = lewatModal
    ? 'Selesaikan'
    : isLastStep
      ? isSubmitting
        ? 'Mengirim...'
        : 'Kirim Survei'
      : 'Pertanyaan Selanjutnya';

  const labelPendek = lewatModal
    ? 'Selesaikan'
    : isLastStep
      ? isSubmitting
        ? 'Mengirim...'
        : 'Kirim'
      : 'Selanjutnya';

  // Pesawat kertas menjanjikan pengiriman yang belum terjadi: "Selesaikan"
  // hanya membuka modal.
  const Ikon = lewatModal ? ClipboardCheck : isLastStep ? Send : ArrowRight;

  return (
    <div className="pt-8 border-t border-outline-variant/30 mt-12">
      <div className="flex flex-row items-center justify-between gap-3 w-full">
        <button 
          className={`flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-8 py-3 min-h-[48px] rounded-lg border border-outline-variant font-semibold transition-colors text-sm sm:text-base
            ${isFirstStep 
              ? 'opacity-50 cursor-not-allowed text-outline' 
              : 'text-secondary hover:bg-surface-container-low active:scale-95'
            }
          `}
          onClick={prevStep}
          disabled={isFirstStep}
        >
          <ArrowLeft className="mr-1.5 sm:mr-2 w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
          <span>Kembali</span>
        </button>
        
        <button 
          className={`flex-1 sm:flex-none flex items-center justify-center px-3 sm:px-8 py-3 min-h-[48px] rounded-lg font-semibold shadow-sm transition-all text-sm sm:text-base
            ${isNextDisabled 
              ? 'bg-surface-dim text-secondary cursor-not-allowed border border-outline-variant' 
              : 'bg-primary text-white hover:bg-primary-hover shadow-primary/20 active:scale-95 border border-transparent'
            }
          `}
          onClick={handleNextOrSubmit}
          disabled={isNextDisabled}
        >
          <span className="hidden sm:inline">{labelPanjang}</span>
          <span className="sm:hidden">{labelPendek}</span>
          <Ikon className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
        </button>
      </div>

      {submitError && !modalTerbuka && (
        <div className="mt-4 text-center text-error text-sm font-semibold">
          <p>{submitError}</p>
          {/* Jalan keluarnya, bukan sekadar keterangan bahwa ada jalan keluar.
              Sebelumnya pesannya sendiri yang menyuruh "Buka halaman
              Persetujuan terlebih dahulu" -- menyebut tujuan tanpa memberi
              jalan ke sana, tepat saat pengirimannya baru saja gagal. */}
          {submitErrorCode === KODE_PERSETUJUAN_DIBUTUHKAN && (
            <ConsentRequiredAction className="mt-3" />
          )}
        </div>
      )}

      <p className="mt-8 text-center text-text-secondary text-sm">
        Jawaban Anda disimpan secara otomatis. Anda dapat kembali ke pertanyaan sebelumnya jika diperlukan.
      </p>

      <ModalKirimSurvei isOpen={modalTerbuka} onBatal={() => setModalTerbuka(false)} />
    </div>
  );
}
