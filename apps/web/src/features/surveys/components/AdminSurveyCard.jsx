import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Switch from '@/components/ui/Switch';
import AdminSurveyCardStats from './AdminSurveyCardStats';
import AdminSurveyCardActions from './AdminSurveyCardActions';

export default function AdminSurveyCard({ survey, onTogglePeriod, onDuplicate, onDelete }) {
  const { id, title, status, period, respondentsCount, ikmScore, isClosed } = survey;
  
  const isDraft = status === 'DRAF';
  const isClosedStatus = status === 'DITUTUP';
  
  let statusBadgeProps = { variant: 'default', label: status };
  if (status === 'AKTIF') {
    statusBadgeProps = { variant: 'success', label: 'AKTIF' };
  } else if (isClosedStatus) {
    statusBadgeProps = { variant: 'danger', label: 'DITUTUP' };
  }

  return (
    <Card className={`p-lg relative overflow-hidden hover:shadow-md transition-shadow ${isDraft ? 'border-outline-variant' : ''}`}>
      {isDraft && <div className="absolute left-0 top-0 w-1 h-full bg-outline"></div>}
      
      <div className="flex justify-between items-start mb-md">
        <div className="flex flex-wrap gap-sm">
          <Badge variant={statusBadgeProps.variant} className="px-sm py-[2px] text-[10px] uppercase rounded">
            {statusBadgeProps.label}
          </Badge>
          <Badge 
            variant="default" 
            className={`px-sm py-[2px] text-[10px] uppercase rounded ${isDraft ? 'bg-surface-container-low text-on-surface-variant/40 italic' : ''}`}
          >
            PERIODE: {period}
          </Badge>
        </div>
        
        {!isDraft && (
          <div className="flex items-center gap-sm">
            <span className="text-label-md text-on-surface-variant">
              {isClosed ? 'Buka Periode' : 'Tutup Periode'}
            </span>
            <Switch 
              checked={!isClosed} 
              onChange={() => onTogglePeriod(id, !isClosed)}
            />
          </div>
        )}
      </div>

      <h3 className="font-h3 text-h3 text-text-primary mb-lg">{title}</h3>

      <AdminSurveyCardStats 
        respondentsCount={respondentsCount}
        ikmScore={ikmScore}
        isDraft={isDraft}
      />

      <AdminSurveyCardActions isDraft={isDraft} surveyId={id} onDuplicate={onDuplicate} onDelete={onDelete} />
    </Card>
  );
}
