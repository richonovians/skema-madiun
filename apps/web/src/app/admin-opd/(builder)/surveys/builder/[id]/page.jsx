'use client';

import React, { useState, useEffect, use } from 'react';
import BuilderLayout from '@/features/surveys/builder/components/BuilderLayout';
import BuilderCanvas from '@/features/surveys/builder/components/BuilderCanvas';
import FloatingStatus from '@/features/surveys/builder/components/FloatingStatus';
import { getUnsur } from '@/features/surveys/services/reference.api';

const DUMMY_INITIAL_QUESTIONS = [
  {
    id: 'q1',
    isBaku: true,
    title: 'U1: Persyaratan',
    text: 'Bagaimana pendapat Saudara tentang kesesuaian persyaratan pelayanan dengan jenis pelayanannya?',
    type: 'Skala Penilaian 1-4',
    isRequired: true
  },
  {
    id: 'q2',
    isBaku: true,
    title: 'U2: Sistem, Mekanisme, dan Prosedur',
    text: 'Bagaimana pemahaman Saudara tentang kemudahan prosedur pelayanan di unit ini?',
    type: 'Skala Penilaian 1-4',
    isRequired: true
  }
];

/** Ubah baris `GET /ref/unsur` (kode+teks) ke bentuk yang dipakai builder ini. */
function toBakuQuestion(unsur) {
  return {
    id: unsur.kode.toLowerCase(),
    isBaku: true,
    title: `${unsur.kode}: ${unsur.teks}`,
    text: unsur.teks,
    type: 'Skala Penilaian 1-4',
    isRequired: true,
  };
}

export default function SurveyBuilderPage({ params }) {
  const resolvedParams = use(params);
  const isNew = resolvedParams.id === 'new';
  const [questions, setQuestions] = useState(isNew ? [] : DUMMY_INITIAL_QUESTIONS);
  // Sumber tunggal 9 unsur baku SKM -- JANGAN hardcode ulang di sini (INT-30: U8/U9
  // pernah tertukar krn frontend menyalin urutan PermenPANRB 14/2017 secara manual).
  const [nineUnsur, setNineUnsur] = useState([]);

  useEffect(() => {
    let cancelled = false;
    getUnsur()
      .then((rows) => {
        if (!cancelled) setNineUnsur(rows.map(toBakuQuestion));
      })
      .catch(() => {
        // Gagal ambil unsur baku -- tombol "tambah unsur baku" akan tampak tak berefek
        // (nineUnsur tetap []); tidak menghalangi penulisan pertanyaan kustom lainnya.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const handleAddCustom = (type = 'Skala Penilaian 1-4') => {
    const customCount = questions.filter(q => !q.isBaku).length;
    const newId = `c_${Date.now()}`;
    setQuestions(prev => [
      ...prev,
      {
        id: newId,
        isBaku: false,
        title: `Pertanyaan Kustom #${customCount + 1}`,
        text: '',
        type: type,
        isRequired: true
      }
    ]);
  };

  const handleAddBaku = () => {
    // Add all 9 unsur that are not already in the list (by checking title prefix roughly)
    const existingBakuTitles = questions.filter(q => q.isBaku).map(q => q.title.substring(0, 2));
    const newUnsur = nineUnsur.filter(u => !existingBakuTitles.includes(u.title.substring(0, 2)));
    
    if (newUnsur.length > 0) {
      setQuestions(prev => [...newUnsur, ...prev]);
    }
  };

  return (
    <BuilderLayout onAddBaku={handleAddBaku} onAddCustom={handleAddCustom}>
      <BuilderCanvas 
        questions={questions}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        onAdd={() => handleAddCustom('Skala Penilaian 1-4')}
      />
      <FloatingStatus questionCount={questions.length} />
    </BuilderLayout>
  );
}
