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
    <div className="mb-12 bg-gradient-to-br from-blue-50/50 to-white p-6 md:p-8 rounded-2xl shadow-sm border border-primary/10 relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6 relative z-10">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white shadow-sm border border-primary/10 flex items-center justify-center text-primary shrink-0">
            <ListTodo size={24} />
          </div>
          <div>
            <p className="text-primary/80 text-xs font-bold uppercase tracking-widest mb-1">
              Status Progres
            </p>
            <h2 className="text-2xl font-bold text-text-primary">
              Pertanyaan {currentNumber} <span className="text-text-secondary font-medium">dari {totalQuestions}</span>
            </h2>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-text-secondary">Penyelesaian</span>
          <span className="px-4 py-1.5 bg-primary text-white rounded-full text-sm font-bold shadow-md shadow-primary/20">
            {progressPercentage}%
          </span>
        </div>
      </div>
      
      <div className="relative z-10">
        <ProgressBar progress={progressPercentage} />
      </div>
    </div>
  );
}
