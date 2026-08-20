'use client';

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import RadioCard from '@/components/ui/RadioCard';
import useSurveyStore from '../store/useSurveyStore';
import { scaleStepsFromOptions } from '../constants/scaleLabels';

const MAX_TEXT_LENGTH = 1000;

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
        // Seharusnya tak terjadi (backend mewajibkan >=2 opsi saat dibuat), tapi
        // lebih baik jujur daripada menampilkan skala yang salah.
        return (
          <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 border border-amber-200">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <p className="text-sm text-amber-800 font-medium">
              Opsi jawaban pertanyaan ini belum tersedia. Silakan hubungi pengelola survei.
            </p>
          </div>
        );
      }
      return (
        <div className="grid grid-cols-1 gap-4">
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
      const steps = scaleStepsFromOptions(currentQuestion.options);
      return (
        <div className="grid grid-cols-1 gap-4">
          {steps.map((step) => (
            <RadioCard
              key={step.value}
              name={radioName}
              value={step.value}
              label={step.label}
              numberIcon={step.value}
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
    <div className="mb-10">
      <h3 className="font-h3 text-h3 text-text-primary leading-relaxed mb-8">
        {questionNumber}. {currentQuestion.text}
      </h3>

      {renderAnswerInput()}
    </div>
  );
}
