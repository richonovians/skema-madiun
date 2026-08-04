import React from 'react';
import Card from '@/components/ui/Card';
import { Users, Star, Clock } from 'lucide-react';

export default function SurveyResponsesSummary({ totalResponses, averageScore, lastResponseDate }) {
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-md mb-lg">
      <Card className="p-md flex items-center gap-md">
        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          <Users size={24} />
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Total Respons</p>
          <p className="font-h3 text-h3 text-on-surface">{totalResponses}</p>
        </div>
      </Card>
      
      <Card className="p-md flex items-center gap-md">
        <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500">
          <Star size={24} />
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Nilai Rata-Rata</p>
          <p className="font-h3 text-h3 text-on-surface">{averageScore.toFixed(2)}</p>
        </div>
      </Card>
      
      <Card className="p-md flex items-center gap-md">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
          <Clock size={24} />
        </div>
        <div>
          <p className="text-label-sm text-on-surface-variant uppercase tracking-wider">Respons Terakhir</p>
          <p className="font-h4 text-h4 text-on-surface">{formatDate(lastResponseDate)}</p>
        </div>
      </Card>
    </div>
  );
}
