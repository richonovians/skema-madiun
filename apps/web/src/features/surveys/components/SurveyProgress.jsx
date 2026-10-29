'use client';

import React from 'react';
import { ListTodo } from 'lucide-react';
import ProgressBar from '@/components/ui/ProgressBar';
import useSurveyStore from '../store/useSurveyStore';

export default function SurveyProgress() {
  const { currentStepIndex, surveyData } = useSurveyStore();

  if (!surveyData || !surveyData.questions) return null;

  const totalQuestions = surveyData.questions.length;
  // 1-based index for display
  const currentNumber = currentStepIndex + 1;
  
  // Calculate percentage (0 to 100)
  const progressPercentage = Math.round((currentNumber / totalQuestions) * 100);

  return (
    <div className="mb-3">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <ListTodo size={14} />
          </div>
          <div>
            <p className="text-primary/70 text-[10px] font-bold uppercase tracking-widest leading-none mb-0.5">
              Pertanyaan
            </p>
            <p className="text-sm font-bold text-text-primary leading-none">
              {currentNumber} <span className="text-text-secondary font-medium">dari {totalQuestions}</span>
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-primary text-white rounded-full text-xs font-bold shadow shadow-primary/20">
          {progressPercentage}%
        </span>
      </div>
      <ProgressBar progress={progressPercentage} />
    </div>
  );
}
