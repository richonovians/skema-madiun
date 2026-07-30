import React from 'react';
import QuestionBlock from './QuestionBlock';
import { Plus } from 'lucide-react';

export default function BuilderCanvas({ questions, onDelete, onUpdate, onAdd }) {
  return (
    <main className="flex-1 bg-slate-50 relative overflow-y-auto" style={{
      backgroundSize: '24px 24px',
      backgroundImage: 'radial-gradient(circle, #E2E8F0 1px, transparent 1px)'
    }}>
      <div className="max-w-4xl mx-auto py-3xl px-lg flex flex-col">
        {/* Welcome/Header Card */}
        <div className="bg-white border border-border rounded-xl p-2xl shadow-sm text-center mb-xl">
          <h2 className="font-headline-lg text-headline-lg mb-xs">Kuesioner Kepuasan Layanan</h2>
          <p className="text-text-secondary font-body-md text-body-md">Dinas Kesehatan Kabupaten Madiun - Periode Triwulan III 2024</p>
        </div>

        {/* Questions List */}
        <div className="flex flex-col">
          {questions.map((q) => (
            <QuestionBlock 
              key={q.id} 
              question={q} 
              onDelete={onDelete}
              onUpdate={onUpdate}
            />
          ))}
        </div>

        {/* Drop Placeholder */}
        <div 
          onClick={onAdd}
          className="border-2 border-dashed border-border rounded-xl p-2xl flex flex-col items-center justify-center gap-md text-text-secondary hover:border-primary-container hover:bg-primary-container/5 transition-all cursor-pointer group mt-md"
        >
          <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center group-hover:scale-110 transition-transform">
            <Plus size={24} />
          </div>
          <span className="text-label-md font-label-md">Tarik komponen ke sini untuk menambah pertanyaan</span>
        </div>
      </div>
    </main>
  );
}
