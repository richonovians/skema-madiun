'use client';

import React from 'react';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import useSurveyStore from '../store/useSurveyStore';

export default function SurveyNavigation() {
  const { currentStepIndex, surveyData, answers, nextStep, prevStep, setCompleted } = useSurveyStore();

  if (!surveyData || !surveyData.questions) return null;

  const currentQuestion = surveyData.questions[currentStepIndex];
  const totalQuestions = surveyData.questions.length;
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === totalQuestions - 1;
  
  // Disable next/submit if no answer is selected for the current question
  const isNextDisabled = !answers[currentQuestion.id];

  const handleNextOrSubmit = () => {
    if (isLastStep) {
      // Logic for submitting the survey
      // TODO: Implement actual API call here later
      setCompleted();
    } else {
      nextStep();
    }
  };

  return (
    <div className="pt-8 border-t border-outline-variant/30 mt-12">
      <div className="flex flex-row items-center justify-between gap-3 sm:gap-4">
        <button 
          className={`flex-1 sm:flex-none w-full sm:w-auto flex items-center justify-center px-2 sm:px-8 py-3 min-h-[48px] rounded-lg border border-outline font-semibold transition-colors text-sm sm:text-base
            ${isFirstStep 
              ? 'opacity-50 cursor-not-allowed text-outline' 
              : 'text-secondary hover:bg-surface-container-low active:scale-95'
            }
          `}
          onClick={prevStep}
          disabled={isFirstStep}
        >
          <ArrowLeft className="mr-1 sm:mr-2" size={18} />
          Kembali
        </button>
        
        <button 
          className={`flex-[1.2] sm:flex-none w-full sm:w-auto flex items-center justify-center px-2 sm:px-8 py-3 min-h-[48px] rounded-lg font-semibold shadow-sm transition-all text-sm sm:text-base text-center leading-tight
            ${isNextDisabled 
              ? 'bg-surface-dim text-secondary cursor-not-allowed border border-outline-variant' 
              : 'bg-primary text-white hover:bg-primary-hover shadow-primary/20 active:scale-95'
            }
          `}
          onClick={handleNextOrSubmit}
          disabled={isNextDisabled}
        >
          <span>{isLastStep ? 'Kirim Survei' : 'Selanjutnya'}</span>
          {isLastStep ? <Send className="ml-1 sm:ml-2 shrink-0" size={18} /> : <ArrowRight className="ml-1 sm:ml-2 shrink-0" size={18} />}
        </button>
      </div>

      <p className="mt-8 text-center text-text-secondary text-sm">
        Jawaban Anda disimpan secara otomatis. Anda dapat kembali ke pertanyaan sebelumnya jika diperlukan.
      </p>
    </div>
  );
}
