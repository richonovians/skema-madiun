import React from 'react';
import SurveyCard from './SurveyCard';
import EmptyState from '@/components/ui/EmptyState';
import { FileX } from 'lucide-react';

export default function SurveyGrid({ surveys }) {
  if (!surveys || surveys.length === 0) {
    return (
      <EmptyState 
        icon={<FileX size={64} />}
        title="Tidak Ada Survei Ditemukan"
        description="Coba ubah filter atau kata kunci pencarian Anda."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
      {surveys.map((survey) => (
        <SurveyCard 
          key={survey.id}
          id={survey.id}
          title={survey.title}
          opd={survey.opd}
          deadline={survey.deadline}
          questionsCount={survey.questionsCount}
          status={survey.status}
        />
      ))}
    </div>
  );
}
