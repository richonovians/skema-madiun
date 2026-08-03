import React from 'react';
import Card from '@/components/ui/Card';
import { MessageSquare } from 'lucide-react';
import RadioCard from '@/components/ui/RadioCard';

export default function SurveyResponseAnswers({ answers, suggestion }) {
  return (
    <Card className="p-lg">
      <h3 className="font-h3 text-h3 text-on-surface mb-md pb-sm border-b border-outline-variant">
        Jawaban Survei
      </h3>
      
      <div className="space-y-xl">
        {answers?.map((answer, index) => (
          <div key={index} className="pb-md border-b border-outline-variant last:border-0 last:pb-0">
            <p className="font-medium text-on-surface mb-md text-lg">
              <span className="text-on-surface-variant mr-xs">{index + 1}.</span> 
              {answer.question}
            </p>
            
            <div className="pl-4 space-y-3 pointer-events-none">
              {answer.options?.map((opt, optIdx) => (
                <RadioCard 
                  key={optIdx}
                  name={`q-${index}`}
                  value={opt}
                  label={opt}
                  checked={opt === answer.answer}
                  onChange={() => {}}
                  numberIcon={optIdx + 1}
                />
              ))}
            </div>
          </div>
        ))}

      </div>
    </Card>
  );
}
