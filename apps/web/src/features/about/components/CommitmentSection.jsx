import React from 'react';
import { CheckCircle2 } from 'lucide-react';
import { aboutContent } from '../constants/aboutContent';

export default function CommitmentSection() {
  const { commitment } = aboutContent;

  return (
    <section className="py-20 bg-surface">
      <div className="max-w-[1000px] mx-auto px-6">
        <div className="bg-gradient-to-br from-primary to-primary-hover rounded-[2rem] p-8 md:p-12 text-white shadow-2xl overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2"></div>
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-in-up">
              <h2 className="font-h2 text-h2-sm md:text-h2 text-white mb-6">
                {commitment.title}
              </h2>
              <p className="font-body text-body-lg text-white/90 leading-relaxed">
                {commitment.description}
              </p>
            </div>
            
            <div className="space-y-4 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
              {commitment.points.map((point, index) => (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 mt-1">
                    <CheckCircle2 className="w-6 h-6 text-white" />
                  </div>
                  <p className="font-body text-body text-white/90 font-medium">
                    {point}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
