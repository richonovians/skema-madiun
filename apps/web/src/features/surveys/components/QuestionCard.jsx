'use client';

import React from 'react';
import RadioCard from '@/components/ui/RadioCard';
import useSurveyStore from '../store/useSurveyStore';

export default function QuestionCard() {
  const { currentStepIndex, surveyData, answers, setAnswer } = useSurveyStore();

  if (!surveyData || !surveyData.questions) return null;

  const currentQuestion = surveyData.questions[currentStepIndex];
  // Convert 0-based index to 1-based index for display
  const questionNumber = currentStepIndex + 1;
  
  // The current selected answer for this specific question
  const currentAnswer = answers[currentQuestion.id];

  const handleOptionChange = (e) => {
    setAnswer(currentQuestion.id, e.target.value);
  };

  // We are currently handling only the scale 1 to 4 type as per design
  const options = [
    { value: '1', label: 'Tidak Cepat / Tidak Baik', icon: '1' },
    { value: '2', label: 'Kurang Cepat / Kurang Baik', icon: '2' },
    { value: '3', label: 'Cepat / Baik', icon: '3' },
    { value: '4', label: 'Sangat Cepat / Sangat Baik', icon: '4' },
  ];

  return (
    <div className="mb-10">
      <h3 className="font-h3 text-h3 text-text-primary leading-relaxed mb-8">
        {questionNumber}. {currentQuestion.text}
      </h3>
      
      <div className="grid grid-cols-1 gap-4">
        {options.map((option) => (
          <RadioCard
            key={option.value}
            name={`question_${currentQuestion.id}`}
            value={option.value}
            label={option.label}
            numberIcon={option.icon}
            checked={currentAnswer === option.value}
            onChange={handleOptionChange}
          />
        ))}
      </div>
    </div>
  );
}
