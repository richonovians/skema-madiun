'use client';

import React, { useState } from 'react';
import BuilderLayout from '@/features/surveys/builder/components/BuilderLayout';
import BuilderCanvas from '@/features/surveys/builder/components/BuilderCanvas';
import FloatingStatus from '@/features/surveys/builder/components/FloatingStatus';

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

const NINE_UNSUR = [
  { id: 'u1', isBaku: true, title: 'U1: Persyaratan', text: 'Kesesuaian persyaratan pelayanan dengan jenis pelayanannya.', type: 'Skala Penilaian 1-4', isRequired: true },
  { id: 'u2', isBaku: true, title: 'U2: Prosedur', text: 'Kemudahan prosedur pelayanan di unit ini.', type: 'Skala Penilaian 1-4', isRequired: true },
  { id: 'u3', isBaku: true, title: 'U3: Waktu Pelayanan', text: 'Kecepatan waktu dalam memberikan pelayanan.', type: 'Skala Penilaian 1-4', isRequired: true },
  { id: 'u4', isBaku: true, title: 'U4: Biaya/Tarif', text: 'Kewajaran biaya/tarif dalam pelayanan.', type: 'Skala Penilaian 1-4', isRequired: true },
  { id: 'u5', isBaku: true, title: 'U5: Produk Spesifikasi', text: 'Kesesuaian produk pelayanan antara yang tercantum dalam standar pelayanan dengan hasil yang diberikan.', type: 'Skala Penilaian 1-4', isRequired: true },
  { id: 'u6', isBaku: true, title: 'U6: Kompetensi Pelaksana', text: 'Kompetensi/kemampuan petugas dalam pelayanan.', type: 'Skala Penilaian 1-4', isRequired: true },
  { id: 'u7', isBaku: true, title: 'U7: Perilaku Pelaksana', text: 'Perilaku petugas dalam pelayanan terkait kesopanan dan keramahan.', type: 'Skala Penilaian 1-4', isRequired: true },
  { id: 'u8', isBaku: true, title: 'U8: Penanganan Pengaduan', text: 'Kualitas sarana prasarana penanganan pengaduan.', type: 'Skala Penilaian 1-4', isRequired: true },
  { id: 'u9', isBaku: true, title: 'U9: Sarana dan Prasarana', text: 'Kualitas sarana dan prasarana.', type: 'Skala Penilaian 1-4', isRequired: true }
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
    const newUnsur = NINE_UNSUR.filter(u => !existingBakuTitles.includes(u.title.substring(0, 2)));
    
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
