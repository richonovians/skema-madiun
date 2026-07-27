'use client';

import React, { useState } from 'react';
import BuilderLayout from '@/features/surveys/builder/components/BuilderLayout';
import BuilderCanvas from '@/features/surveys/builder/components/BuilderCanvas';
import FloatingStatus from '@/features/surveys/builder/components/FloatingStatus';

const DUMMY_INITIAL_QUESTIONS = [
  {
    id: 'q1',
    isBaku: true,
    title: 'Unsur 1: Persyaratan Layanan',
    text: 'Bagaimana pendapat Saudara tentang kesesuaian persyaratan pelayanan dengan jenis pelayanannya?',
    type: 'Skala Penilaian 1-4',
    isRequired: true
  },
  {
    id: 'q2',
    isBaku: false,
    title: 'Pertanyaan Kustom #1',
    text: 'Apakah fasilitas ruang tunggu sudah memadai?',
    type: 'Skala Penilaian 1-4',
    isRequired: true
  }
];

export default function SurveyBuilderPage({ params }) {
  const [questions, setQuestions] = useState(DUMMY_INITIAL_QUESTIONS);

  // In a real application, we would use dnd-kit or similar for drag and drop.
  // For now, we simulate delete and update operations.

  const handleDelete = (id) => {
    setQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleUpdate = (id, updates) => {
    setQuestions(prev => prev.map(q => 
      q.id === id ? { ...q, ...updates } : q
    ));
  };

  return (
    <BuilderLayout>
      <BuilderCanvas 
        questions={questions}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
      />
      <FloatingStatus questionCount={questions.length} />
    </BuilderLayout>
  );
}
