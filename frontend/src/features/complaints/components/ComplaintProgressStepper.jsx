import React from 'react';
import Card from '@/components/ui/Card';
import { Check, Hourglass } from 'lucide-react';
import clsx from 'clsx';

/**
 * Progress steps: 'diterima', 'diproses', 'selesai'
 */
export default function ComplaintProgressStepper({ currentStatus = 'diproses' }) {
  
  const steps = [
    {
      id: 'diterima',
      title: 'Diterima',
      description: 'Tiket telah diverifikasi sistem.',
    },
    {
      id: 'diproses',
      title: 'Diproses',
      description: 'Sedang dalam peninjauan OPD terkait.',
    },
    {
      id: 'selesai',
      title: 'Selesai',
      description: 'Hasil tindak lanjut akan diinfokan.',
    }
  ];

  // Helper to determine step status
  const getStepState = (stepId, current) => {
    const order = ['diterima', 'diproses', 'selesai'];
    const currentIndex = order.indexOf(current.toLowerCase());
    const stepIndex = order.indexOf(stepId);
    
    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  return (
    <Card className="p-5 sm:p-6 md:p-8">
      <h3 className="font-h3 text-h3 mb-6 text-text-primary">Status Progress</h3>
      <div className="relative space-y-6">
        {steps.map((step, index) => {
          const state = getStepState(step.id, currentStatus);
          const isLast = index === steps.length - 1;
          
          return (
            <div key={step.id} className="flex gap-3 sm:gap-4 relative">
              <div className="z-10 flex flex-col items-center">
                
                {/* Icon Container */}
                {state === 'completed' && (
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white">
                    <Check size={18} strokeWidth={3} />
                  </div>
                )}
                {state === 'active' && (
                  <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center animate-pulse">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                  </div>
                )}
                {state === 'pending' && (
                  <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-outline">
                    <Hourglass size={18} />
                  </div>
                )}

                {/* Line connector */}
                {!isLast && (
                  <div 
                    className={clsx(
                      "w-[2px] absolute top-8 -bottom-6",
                      state === 'completed' ? "bg-primary" : "bg-outline-variant"
                    )}
                  ></div>
                )}
              </div>
              
              <div className={clsx(!isLast && "pb-md")}>
                <p className={clsx(
                  "font-bold",
                  state === 'completed' ? "text-text-primary" :
                  state === 'active' ? "text-primary" : "text-outline"
                )}>
                  {step.title}
                </p>
                <p className="text-text-secondary text-label-md">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
