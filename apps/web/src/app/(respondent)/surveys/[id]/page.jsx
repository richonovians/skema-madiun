'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import SurveyProgress from '@/features/surveys/components/SurveyProgress';
import QuestionCard from '@/features/surveys/components/QuestionCard';
import SurveyNavigation from '@/features/surveys/components/SurveyNavigation';
import SurveyCompletion from '@/features/surveys/components/SurveyCompletion';
import useSurveyStore from '@/features/surveys/store/useSurveyStore';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { getSurveyFill } from '@/features/surveys/services/surveys.api';

export default function SurveyWizardPage() {
  const { id } = useParams();
  const router = useRouter();
  const { isCompleted, initSurvey, resetSurvey } = useSurveyStore();

  const fetchFill = useCallback(() => getSurveyFill(id), [id]);
  const { data: fillData, isLoading, error, refetch } = useAsync(fetchFill);

  const [showWarning, setShowWarning] = useState(false);
  const [pendingUrl, setPendingUrl] = useState('');

  useEffect(() => {
    if (fillData && !fillData.sudahMengisi) {
      initSurvey(fillData);
    }
    return () => {
      resetSurvey();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillData]);

  // Handle prevention of leaving page when survey is active.
  //
  // `fillData?.sudahMengisi` dicek DI SINI (2026-08-06, laporan bug user:
  // "tidak ada tombol yang bisa diklik" di halaman survei yang sudah pernah
  // diisi sebelumnya) -- SEBELUMNYA listener klik-global ini tetap terpasang
  // walau survei sudah diisi (tak ada progres yg bisa hilang), padahal modal
  // konfirmasinya ("Tinggalkan Survei?") CUMA dirender di cabang JSX lain
  // (return utama di bawah, bukan cabang early-return `sudahMengisi`). Hasilnya
  // klik pada SEMUA <a>/<Link> di halaman (navbar, dropdown profil, tombol
  // "Kembali ke Daftar Survei") di-preventDefault tanpa modal apa pun muncul
  // -- klik terasa "mati". Tombol biasa (bukan link, mis. logout) tak
  // terpengaruh krn listener ini hanya mencocokkan `closest('a')`.
  useEffect(() => {
    if (!fillData || fillData.sudahMengisi || isCompleted) return;

    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = '';
    };

    const handleLinkClick = (e) => {
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
  }, [fillData, isCompleted]);

  if (isLoading) {
    return (
      <main className="max-w-container-max mx-auto py-8 sm:py-12 px-4 sm:px-6">
        <LoadingState label="Memuat survei..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className="max-w-container-max mx-auto py-8 sm:py-12 px-4 sm:px-6">
        <ErrorState title="Gagal memuat survei" description={error.message} onRetry={refetch} />
      </main>
    );
  }

  if (fillData?.sudahMengisi) {
    return (
      <main className="max-w-container-max mx-auto py-8 sm:py-12 px-4 sm:px-6">
        <EmptyState
          icon={<CheckCircle2 size={64} />}
          title="Anda Sudah Mengisi Survei Ini"
          description="Survei ini hanya dapat diisi satu kali per akun. Terima kasih atas partisipasi Anda."
          action={
            <Link href="/surveys">
              <button className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition-colors">
                Kembali ke Daftar Survei
              </button>
            </Link>
          }
        />
      </main>
    );
  }

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
