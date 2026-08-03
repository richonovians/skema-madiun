import React from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';

export default function SurveyResponsesHeader({ surveyTitle, opd }) {
  return (
    <div className="mb-lg">
      <div className="flex items-center text-label-md text-on-surface-variant mb-md">
        <Link href="/admin-opd/surveys" className="hover:text-primary transition-colors">
          Daftar Survei
        </Link>
        <ChevronRight size={16} className="mx-xs" />
        <span className="text-on-surface">Respons Survei</span>
      </div>

      <div className="flex items-center gap-md">
        <Link href="/admin-opd/surveys">
          <button className="p-sm hover:bg-surface-container rounded-full transition-colors">
            <ArrowLeft size={24} className="text-on-surface" />
          </button>
        </Link>
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">{surveyTitle || 'Memuat...'}</h1>
          <p className="text-body-md text-on-surface-variant mt-xs">
            {opd || 'Memuat...'}
          </p>
        </div>
      </div>
    </div>
  );
}
