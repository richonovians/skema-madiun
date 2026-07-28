import React from 'react';
import Link from 'next/link';
import { FileText, Hospital } from 'lucide-react';
import SurveyCard from './SurveyCard';

export default function AvailableSurveysWidget() {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-text-primary">Survei Kepuasan Tersedia</h2>
        <Link href="#" className="text-primary text-sm font-medium hover:underline inline-flex items-center min-h-[44px]">
          Lihat Semua Survei
        </Link>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
        <SurveyCard 
          icon={FileText}
          title="Survei Kualitas Layanan DPMPTSP"
          description="Evaluasi kepuasan masyarakat terhadap proses perizinan terpadu satu pintu tahun anggaran 2026."
          deadline="Hingga 30 Juli 2026"
        />
        <SurveyCard 
          icon={Hospital}
          title="Evaluasi Pelayanan RSUD Caruban"
          description="Bagikan pengalaman Anda saat berobat untuk meningkatkan mutu pelayanan kesehatan daerah."
          deadline="Hingga 15 Agu 2026"
        />
      </div>
    </section>
  );
}
