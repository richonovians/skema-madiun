import React from 'react';
import Link from 'next/link';
import { ChevronRight, ArrowLeft } from 'lucide-react';

/**
 * "opd" (dummy hardcode "RSUD Daerah") diganti "period" (periode survei asli) -- admin OPD sudah tahu instansinya sendiri dari navbar.
 *
 * `listHref` (2026-08-19): '/admin-opd/surveys' sebelumnya tertanam keras, padahal
 * layar respons kini dipakai Admin Kabupaten juga (lihat SurveyResponsesScreen.jsx)
 * -- tanpa prop ini tombol kembali akan melempar Admin Kab ke area peran lain.
 */
export default function SurveyResponsesHeader({ surveyTitle, period, listHref }) {
  return (
    <div className="mb-lg">
      <div className="flex items-center text-label-md text-on-surface-variant mb-md">
        <Link href={listHref} className="hover:text-primary transition-colors">
          Daftar Survei
        </Link>
        <ChevronRight size={16} className="mx-xs" />
        <span className="text-on-surface">Respons Survei</span>
      </div>

      <div className="flex items-center gap-md">
        <Link href={listHref}>
          <button className="p-sm hover:bg-surface-container rounded-full transition-colors">
            <ArrowLeft size={24} className="text-on-surface" />
          </button>
        </Link>
        <div>
          <h1 className="font-h2 text-h2 text-on-surface">{surveyTitle || 'Memuat...'}</h1>
          <p className="text-body-md text-on-surface-variant mt-xs">
            {period ? `Periode: ${period}` : 'Memuat...'}
          </p>
        </div>
      </div>
    </div>
  );
}
