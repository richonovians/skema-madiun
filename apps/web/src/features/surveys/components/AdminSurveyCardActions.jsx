import React from 'react';
import { Eye, Edit2, Copy, FileEdit } from 'lucide-react';
import Link from 'next/link';

export default function AdminSurveyCardActions({ isDraft, surveyId }) {
  const actionButtonClass = "px-md py-sm border border-outline rounded-lg text-label-md font-bold flex items-center gap-sm hover:bg-surface-container-low transition-colors";

  if (isDraft) {
    return (
      <div className="flex flex-wrap gap-md pt-lg border-t border-border">

        <Link href={`/admin-opd/surveys/builder/${surveyId}`}>
          <button className="px-xl py-sm bg-primary text-on-primary rounded-lg text-label-md font-bold flex items-center gap-sm hover:bg-primary-hover transition-colors shadow-lg shadow-primary/10">
            <Edit2 size={18} />
            Lanjut Edit
          </button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-md pt-lg border-t border-border">
      <button className={actionButtonClass}>
        <Copy size={18} />
        Salin Kode
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
