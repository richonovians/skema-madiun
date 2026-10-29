'use client';

import React from 'react';
import { AlertTriangle, Frown, Meh, Smile, Laugh } from 'lucide-react';
import RadioCard from '@/components/ui/RadioCard';
import useSurveyStore from '../store/useSurveyStore';
import { scaleStepsFromOptions } from '../constants/scaleLabels';

const MAX_TEXT_LENGTH = 1000;

/**
 * Icon ekspresi wajah untuk skala 1-4 (seperti Sukma-e):
 * 1: Frown (sedih / tidak cepat / tidak baik)
 * 2: Meh (datar / kurang cepat / kurang baik)
 * 3: Smile (senyum / cepat / baik)
 * 4: Laugh (senyum lebar / sangat cepat / sangat baik)
 */
const getScaleIcon = (value) => {
  switch (String(value)) {
    case '1':
      return <Frown size={20} className="text-red-500 group-hover:scale-110 transition-transform shrink-0" />;
    case '2':
      return <Meh size={20} className="text-amber-500 group-hover:scale-110 transition-transform shrink-0" />;
    case '3':
      return <Smile size={20} className="text-emerald-500 group-hover:scale-110 transition-transform shrink-0" />;
    case '4':
      return <Laugh size={20} className="text-emerald-600 group-hover:scale-110 transition-transform shrink-0" />;
    default:
      return null;
  }
};

/**
 * Kartu satu pertanyaan pada wizard pengisian responden.
 *
 * Bentuk jawaban MENGIKUTI tipe pertanyaan. Sebelum ini kartu ini SELALU
 * merender skala 1-4 apa pun tipenya (opsi 1-4 di-hardcode) -- pertanyaan
 * "Uraian" dan "Pilihan Ganda" tampil sebagai skala, dan jawabannya
 * diterjemahkan salah oleh toSubmitAnswers: angka skala dikirim sebagai
 * `selectedOptionId` yang pasti ditolak backend ("Opsi 3 bukan opsi pertanyaan
 * N"). Kode tipe di sini ('scale_1_to_4'|'text'|'multiple_choice') berasal dari
 * adaptFillQuestion, bukan label builder berbahasa Indonesia.
 */
export default function QuestionCard() {
  const { currentStepIndex, surveyData, answers, setAnswer } = useSurveyStore();

  if (!surveyData || !surveyData.questions) return null;

  const currentQuestion = surveyData.questions[currentStepIndex];
  const questionNumber = currentStepIndex + 1;
  const currentAnswer = answers[currentQuestion.id];
  const radioName = `question_${currentQuestion.id}`;

  const handleChange = (e) => {
    setAnswer(currentQuestion.id, e.target.value);
  };

  const renderAnswerInput = () => {
    if (currentQuestion.type === 'text') {
      return (
        <div className="space-y-2">
          <textarea
            rows={5}
            value={currentAnswer ?? ''}
            onChange={handleChange}
            maxLength={MAX_TEXT_LENGTH}
            placeholder="Tuliskan jawaban Anda di sini..."
            className="w-full p-4 rounded-lg border-2 border-outline-variant/50 bg-surface focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all text-body-md resize-y"
          />
          <p className="text-sm text-text-secondary">
            Pertanyaan ini tidak wajib dijawab. ({(currentAnswer ?? '').length}/{MAX_TEXT_LENGTH}{' '}
            karakter)
          </p>
        </div>
      );
    }

    if (currentQuestion.type === 'multiple_choice') {
      const options = currentQuestion.options ?? [];
      if (options.length === 0) {
        return (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle size={16} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800 font-medium">
              Opsi jawaban pertanyaan ini belum tersedia. Silakan hubungi pengelola survei.
            </p>
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 gap-2">
          {options.map((option, index) => (
            <RadioCard
              key={option.id}
              name={radioName}
              value={String(option.id)}
              label={option.label}
              numberIcon={String.fromCharCode(65 + index)}
              checked={currentAnswer === String(option.id)}
              onChange={handleChange}
            />
          ))}
        </div>
      );
    }

    if (currentQuestion.type === 'scale_1_to_4') {
      // Label per skor berasal dari opsi pertanyaan bila pengelola survei
      // menyesuaikannya (2026-08-20), selain itu label baku SKM. Yang dikirim
      // tetap SKOR-nya (1-4), bukan id opsi -- lihat toSubmitAnswers.
      // Angka diganti ikon emot (Frown, Meh, Smile, Laugh) sesuai desain Sukma-e.
      const steps = scaleStepsFromOptions(currentQuestion.options);
      return (
        <div className="grid grid-cols-1 gap-2">
          {steps.map((step) => (
            <RadioCard
              key={step.value}
              name={radioName}
              value={step.value}
              label={step.label}
              icon={getScaleIcon(step.value)}
              checked={currentAnswer === step.value}
              onChange={handleChange}
            />
          ))}
        </div>
      );
    }

    return (
      <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
        <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm text-amber-800 font-medium">
          Tipe pertanyaan &quot;{currentQuestion.type}&quot; belum dapat ditampilkan.
        </p>
      </div>
    );
  };

  return (
    <div className="mb-4">
      {surveyData?.title && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary/70 mb-1.5">
          {surveyData.title}
        </p>
      )}
      <h3 className="text-sm font-semibold text-text-primary leading-snug mb-4">
        {questionNumber}. {currentQuestion.text}
      </h3>

      {renderAnswerInput()}
    </div>
  );
}
