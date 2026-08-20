'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
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
  } = useSurveyStore();

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

  const handleNextOrSubmit = async () => {
    if (isLastStep) {
      await submitSurvey();
    } else {
      nextStep();
    }
  };

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
          <span className="hidden sm:inline">
            {isLastStep ? (isSubmitting ? 'Mengirim...' : 'Kirim Survei') : 'Pertanyaan Selanjutnya'}
          </span>
          <span className="sm:hidden">
            {isLastStep ? (isSubmitting ? 'Mengirim...' : 'Kirim') : 'Selanjutnya'}
          </span>
          {isLastStep ? <Send className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5 shrink-0" /> : <ArrowRight className="ml-1.5 sm:ml-2 w-4 h-4 sm:w-5 sm:h-5 shrink-0" />}
        </button>
      </div>

      {submitError && (
        <p className="mt-4 text-center text-error text-sm font-semibold">{submitError}</p>
      )}

      <p className="mt-8 text-center text-text-secondary text-sm">
        Jawaban Anda disimpan secara otomatis. Anda dapat kembali ke pertanyaan sebelumnya jika diperlukan.
      </p>
    </div>
  );
}
