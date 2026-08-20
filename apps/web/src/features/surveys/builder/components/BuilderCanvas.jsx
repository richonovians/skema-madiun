'use client';

import React, { useState } from 'react';
import QuestionBlock from './QuestionBlock';
import { Plus } from 'lucide-react';
import { formatPeriodeLabel } from '@/features/surveys/adapters/survey.adapter';

/** Garis penanda tempat pertanyaan akan disisipkan. Di tingkat modul, bukan di
 *  dalam render, supaya tidak dibuat ulang setiap render (react-hooks/static-components). */
function DropIndicator({ active }) {
  if (!active) return null;
  return (
    <div className="h-1.5 -my-1 mb-md rounded-full bg-primary shadow-[0_0_0_3px_rgba(0,0,0,0.04)]" />
  );
}

/**
 * Kanvas builder + seret-lepas urutan pertanyaan (2026-08-19).
 *
 * Posisi lepas dinyatakan sebagai SLOT SISIPAN 0..questions.length (bukan indeks
 * pertanyaan): slot 0 = sebelum pertanyaan pertama, slot n = setelah pertanyaan
 * terakhir. Ini menghilangkan kerancuan "jatuh di atas atau di bawah kartu ini"
 * dan membuat satu rumus dipakai bersama oleh pemindahan urutan maupun
 * penambahan pertanyaan baru dari bilah sisi.
 *
 * Dipakai dua area sekaligus (Admin OPD & Admin Kabupaten) karena seluruh
 * builder ini satu implementasi -- lihat SurveyBuilderScreen.jsx.
 */
export default function BuilderCanvas({
  questions,
  onDelete,
  onUpdate,
  onTextCommit,
  onAdd,
  title,
  periode,
  // Seret-lepas
  drag = null,
  canReorder = false,
  onQuestionDragStart,
  onDragEnd,
  onDropAt,
  onMove,
  onEditOptions,
}) {
  const [overSlot, setOverSlot] = useState(null);

  const isDraggingSomething = drag != null;

  const clearOver = () => setOverSlot(null);

  const handleDragEnd = () => {
    clearOver();
    onDragEnd?.();
  };

  /** Slot ditentukan dari separuh atas/bawah kartu yang dilewati kursor. */
  const handleDragOverCard = (index) => (e) => {
    if (!isDraggingSomething) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = drag.kind === 'new' ? 'copy' : 'move';
    const rect = e.currentTarget.getBoundingClientRect();
    const isTopHalf = e.clientY < rect.top + rect.height / 2;
    setOverSlot(isTopHalf ? index : index + 1);
  };

  const handleDragOverTail = (e) => {
    if (!isDraggingSomething) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = drag.kind === 'new' ? 'copy' : 'move';
    setOverSlot(questions.length);
  };

  const handleDrop = (e) => {
    if (!isDraggingSomething) return;
    e.preventDefault();
    const slot = overSlot;
    clearOver();
    if (slot != null) {
      onDropAt?.(slot);
    }
  };

  return (
    <main
      className="flex-1 bg-slate-50 relative overflow-y-auto"
      style={{
        backgroundSize: '24px 24px',
        backgroundImage: 'radial-gradient(circle, #E2E8F0 1px, transparent 1px)',
      }}
      onDragLeave={(e) => {
        // Hanya bersihkan bila kursor benar-benar keluar dari kanvas, bukan saat
        // berpindah antar kartu anak (dragleave ikut menggelembung).
        if (!e.currentTarget.contains(e.relatedTarget)) clearOver();
      }}
      onDrop={handleDrop}
    >
      <div className="max-w-4xl mx-auto py-3xl px-lg flex flex-col">
        {/* Welcome/Header Card */}
        <div className="bg-white border border-border rounded-xl p-2xl shadow-sm text-center mb-xl">
          <h2 className="font-headline-lg text-headline-lg mb-xs">
            {title || 'Kuesioner Kepuasan Layanan'}
          </h2>
          <p className="text-text-secondary font-body-md text-body-md">
            {periode ? `Periode ${formatPeriodeLabel(periode)}` : 'Periode belum diatur'}
          </p>
        </div>

        {/* Questions List */}
        <div className="flex flex-col">
          {questions.map((q, index) => (
            <div key={q.id} onDragOver={handleDragOverCard(index)}>
              <DropIndicator active={overSlot === index} />
              <QuestionBlock
                question={q}
                index={index}
                total={questions.length}
                isDragging={drag?.kind === 'reorder' && drag.index === index}
                canReorder={canReorder}
                onDragStart={onQuestionDragStart}
                onDragEnd={handleDragEnd}
                onMove={onMove}
                onDelete={onDelete}
                onUpdate={onUpdate}
                onTextCommit={onTextCommit}
                onEditOptions={onEditOptions}
              />
            </div>
          ))}
        </div>

        {/* Slot terakhir + tombol tambah cepat. Klik tetap berfungsi seperti
            sebelumnya; melepas komponen dari bilah sisi ke sini menaruhnya di
            akhir daftar. */}
        <div onDragOver={handleDragOverTail}>
          <DropIndicator active={overSlot === questions.length} />
          <div
            onClick={onAdd}
            className={`border-2 border-dashed rounded-xl p-2xl flex flex-col items-center justify-center gap-md text-text-secondary transition-all cursor-pointer group mt-md ${
              isDraggingSomething
                ? 'border-primary bg-primary-container/10'
                : 'border-border hover:border-primary-container hover:bg-primary-container/5'
            }`}
          >
            <div className="w-12 h-12 rounded-full bg-surface-container flex items-center justify-center group-hover:scale-110 transition-transform">
              <Plus size={24} />
            </div>
            <span className="text-label-md font-label-md text-center">
              {isDraggingSomething
                ? 'Lepas di sini untuk menaruh di akhir daftar'
                : 'Klik di sini untuk menambah pertanyaan skala 1-4'}
            </span>
          </div>
        </div>
      </div>
    </main>
  );
}
