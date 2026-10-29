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
    <div className="pt-4 border-t border-slate-100 mt-4">
      <div className="flex flex-row items-center justify-between gap-3 w-full">
        <button 
          className={`flex-1 sm:flex-none flex items-center justify-center px-4 py-2 min-h-[38px] rounded-lg border border-outline-variant/60 font-semibold transition-colors text-xs sm:text-sm
            ${isFirstStep 
              ? 'opacity-40 cursor-not-allowed text-outline' 
              : 'text-secondary hover:bg-surface-container-low active:scale-95'
            }
          `}
          onClick={prevStep}
          disabled={isFirstStep}
        >
          <ArrowLeft className="mr-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
          <span>Kembali</span>
        </button>
        
        <button 
          className={`flex-1 sm:flex-none flex items-center justify-center px-5 py-2 min-h-[38px] rounded-lg font-semibold shadow-xs transition-all text-xs sm:text-sm
            ${isNextDisabled 
              ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200' 
              : 'bg-primary text-white hover:bg-primary-hover shadow-primary/20 active:scale-95 border border-transparent'
            }
          `}
          onClick={handleNextOrSubmit}
          disabled={isNextDisabled}
        >
          <span className="hidden sm:inline">{labelPanjang}</span>
          <span className="sm:hidden">{labelPendek}</span>
          <Ikon className="ml-1.5 w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
        </button>
      </div>

      {submitError && !modalTerbuka && (
        <div className="mt-3 text-center text-error text-xs font-semibold">
          <p>{submitError}</p>
          {submitErrorCode === KODE_PERSETUJUAN_DIBUTUHKAN && (
            <ConsentRequiredAction className="mt-2" />
          )}
        </div>
      )}

      <p className="mt-3 text-center text-text-secondary text-[11px] leading-tight">
        Jawaban disimpan otomatis. Anda dapat kembali ke pertanyaan sebelumnya.
      </p>

      <ModalKirimSurvei isOpen={modalTerbuka} onBatal={() => setModalTerbuka(false)} />
    </div>
  );
}
