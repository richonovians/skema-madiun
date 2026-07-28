import React from 'react';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import { CalendarDays } from 'lucide-react';
import Link from 'next/link';

export default function SurveyCard({ id, title, opd, deadline, questionsCount, status }) {
  // In the future, status might determine if the button is disabled or says "Sudah Diisi"
  return (
    <Card className="p-6 flex flex-col h-full hover:shadow-md transition-shadow border-slate-200">
      <div className="flex justify-between items-start mb-4 gap-2">
        <Badge variant="secondary" className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-secondary-container text-on-secondary-container border-none shadow-none">
          {opd}
        </Badge>
        <div className="flex items-center text-error text-[12px] font-medium shrink-0">
          <CalendarDays size={16} className="mr-1" />
          {deadline}
        </div>
      </div>
      
      <h3 className="text-headline-md font-headline-md text-text-primary mb-6 flex-grow leading-tight">
        {title}
      </h3>
      
      <div className="flex items-center justify-between mt-auto border-t border-slate-100 pt-4 gap-2">
        <span className="text-label-md font-label-md text-text-secondary">
          {questionsCount} Pertanyaan Baku
        </span>
        <Link href={`/surveys/${id}`}>
          <Button variant="primary" className="rounded-lg shadow-sm active:scale-95 transition-all text-sm px-4">
            Mulai Isi Survei
          </Button>
        </Link>
      </div>
    </Card>
  );
}
