'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { AlertTriangle, X } from 'lucide-react';
import SurveyProgress from '@/features/surveys/components/SurveyProgress';
import QuestionCard from '@/features/surveys/components/QuestionCard';
import SurveyNavigation from '@/features/surveys/components/SurveyNavigation';
import SurveyCompletion from '@/features/surveys/components/SurveyCompletion';
import useSurveyStore from '@/features/surveys/store/useSurveyStore';

// Dummy data for development. Ready to be replaced with API call.
const dummySurveyData = {
  id: '1',
  title: 'Evaluasi Mutu Pelayanan Rawat Jalan RSUD Caruban',
  opd: 'Dinas Kesehatan',
  questions: [
    {
      id: 'q1',
      text: 'Bagaimana kesesuaian persyaratan pelayanan dengan jenis pelayanannya?',
      type: 'scale_1_to_4',
    },
    {
      id: 'q2',
      text: 'Bagaimana kemudahan prosedur pelayanan di unit ini?',
      type: 'scale_1_to_4',
    },
    {
      id: 'q3',
      text: 'Bagaimana kecepatan waktu penyerahan dokumen hasil spesifikasi jenis pelayanan di unit ini?',
      type: 'scale_1_to_4',
    },
    {
      id: 'q4',
      text: 'Bagaimana kewajaran biaya/tarif dalam pelayanan ini?',
      type: 'scale_1_to_4',
    },
    {
      id: 'q5',
      text: 'Bagaimana kesesuaian produk pelayanan antara yang tercantum dalam standar pelayanan dengan hasil yang diberikan?',
      type: 'scale_1_to_4',
    }
  ]
};

export default function SurveyWizardPage() {
  const { id } = useParams(); // URL parameter (survey id)
  const router = useRouter();
  const { isCompleted, initSurvey, resetSurvey } = useSurveyStore();
  
  const [showWarning, setShowWarning] = useState(false);
  const [pendingUrl, setPendingUrl] = useState('');

  useEffect(() => {
    // 1. In a real scenario, fetch data using `id`:
    //    fetch(`/api/v1/surveys/${id}`).then(...)
    
    // 2. Initialize store with data
    initSurvey(dummySurveyData);

    // 3. Cleanup on unmount
    return () => {
      resetSurvey();
    };
  }, [id, initSurvey, resetSurvey]);

  // Handle prevention of leaving page when survey is active
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!isCompleted) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    };

    const handleLinkClick = (e) => {
      if (isCompleted) return;
      const target = e.target.closest('a');
      if (target && target.href) {
        const url = new URL(target.href, window.location.origin);
        if (url.pathname !== window.location.pathname && !target.target) {
          e.preventDefault();
          setPendingUrl(target.href);
          setShowWarning(true);
        }
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('click', handleLinkClick, { capture: true });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('click', handleLinkClick, { capture: true });
    };
  }, [isCompleted]);

  return (
    <main className="max-w-container-max mx-auto py-8 sm:py-12 px-4 sm:px-6 min-h-[calc(100vh-64px)] relative">
      {isCompleted ? (
        <SurveyCompletion />
      ) : (
        <div className="w-full max-w-[800px] mx-auto">
          <SurveyProgress />
          
          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-5 sm:p-8 md:p-10 border border-outline-variant/20">
            <QuestionCard />
            <SurveyNavigation />
          </div>
        </div>
      )}

      {/* Custom Warning Modal */}
      {showWarning && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm"
          style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
        >
          <div 
            className="bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
            style={{ width: '90%', maxWidth: '400px' }}
          >
            <div className="p-6">
              <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center mb-4">
                <AlertTriangle size={24} strokeWidth={2.5} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Tinggalkan Survei?</h3>
              <p className="text-slate-500 text-sm leading-relaxed mb-6">
                Anda memiliki survei yang belum diselesaikan. Jika Anda pergi sekarang, progres pengisian Anda akan hilang.
              </p>
              <div className="flex items-center gap-3 w-full">
                <button 
                  onClick={() => setShowWarning(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
                >
                  Lanjutkan Survei
                </button>
                <button 
                  onClick={() => router.push(pendingUrl)}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors shadow-sm shadow-red-500/20"
                >
                  Ya, Tinggalkan
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
