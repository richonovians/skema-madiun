import React from 'react';
import AdminSurveyCard from './AdminSurveyCard';
import EmptyState from '@/components/ui/EmptyState';
import { FileText } from 'lucide-react';

export default function AdminSurveyCardList({ surveys, onTogglePeriod }) {
  if (!surveys || surveys.length === 0) {
    return (
      <EmptyState 
        icon={<FileText size={64} className="opacity-50" />}
        title="Belum ada survei"
        description="Tidak ada paket survei yang sesuai dengan kriteria yang dipilih."
      />
    );
  }

  return (
    <div className="space-y-lg">
      {surveys.map((survey) => (
        <AdminSurveyCard 
          key={survey.id} 
          survey={survey} 
          onTogglePeriod={onTogglePeriod}
        />
      ))}
    </div>
  );
}
