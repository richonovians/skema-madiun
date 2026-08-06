import React from 'react';
import AdminSurveyCard from './AdminSurveyCard';
import EmptyState from '@/components/ui/EmptyState';
import { FileText } from 'lucide-react';

export default function AdminSurveyCardList({ surveys, onTogglePeriod, onDuplicate, onDelete }) {
  if (!surveys || surveys.length === 0) {
    return (
      <div className="py-2xl">
        <EmptyState
          icon={<FileText size={48} />}
          title="Tidak ada survei"
          description="Belum ada survei yang sesuai dengan filter saat ini."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-lg pb-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
      {surveys.map((survey) => (
        <AdminSurveyCard 
          key={survey.id} 
          survey={survey} 
          onTogglePeriod={onTogglePeriod}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
