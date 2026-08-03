import React, { useState } from 'react';
import { Eye, Edit2, Copy, FileEdit, Check } from 'lucide-react';
import Link from 'next/link';

export default function AdminSurveyCardActions({ isDraft, surveyId, onDuplicate, onDelete }) {
  const [copied, setCopied] = useState(false);
  const actionButtonClass = "px-md py-sm border border-outline rounded-lg text-label-md font-bold flex items-center gap-sm hover:bg-surface-container-low transition-colors";

  const handleCopy = () => {
    // Memanggil prop onDuplicate untuk membuat salinan form di list
    if (onDuplicate) {
      onDuplicate(surveyId);
    }
    
    // Opsional: masih menyalin ID ke clipboard
    const codeToCopy = `SRV-${surveyId || '001'}`;
    navigator.clipboard.writeText(codeToCopy);
    
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isDraft) {
    return (
      <div className="flex flex-wrap gap-md pt-lg border-t border-border">
        <Link href={`/admin-opd/surveys/builder/${surveyId}`}>
          <button className="px-xl py-sm bg-primary text-on-primary rounded-lg text-label-md font-bold flex items-center gap-sm hover:bg-primary-hover transition-colors shadow-lg shadow-primary/10">
            <Edit2 size={18} />
            Lanjut Edit
          </button>
        </Link>
        <button 
          onClick={() => onDelete && onDelete(surveyId)}
          className="px-md py-sm bg-rose-50 text-rose-600 border border-rose-200 rounded-lg text-label-md font-bold flex items-center gap-sm hover:bg-rose-100 transition-colors ml-auto"
        >
          Hapus
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-md pt-lg border-t border-border">
      <button className={actionButtonClass} onClick={handleCopy}>
        {copied ? <Check size={18} className="text-emerald-600" /> : <Copy size={18} />}
        {copied ? 'Tersalin!' : 'Salin Kode'}
      </button>

      <Link href={`/admin-opd/surveys/builder/${surveyId}`}>
        <button className={actionButtonClass}>
          <FileEdit size={18} />
          Edit Pertanyaan
        </button>
      </Link>
    </div>
  );
}
