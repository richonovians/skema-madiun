'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2 } from 'lucide-react';
import SurveyProgress from '@/features/surveys/components/SurveyProgress';
import QuestionCard from '@/features/surveys/components/QuestionCard';
import SurveyNavigation from '@/features/surveys/components/SurveyNavigation';
import SurveyCompletion from '@/features/surveys/components/SurveyCompletion';
import useSurveyStore from '@/features/surveys/store/useSurveyStore';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import EmptyState from '@/components/ui/EmptyState';
import { useAsync } from '@/hooks/useAsync';
import { isAuthenticated } from '@/features/authentication/services/authStorage';
import { sudahMengisiDiPeramban } from '@/utils/surveyFillMarker';
import { getPublicSurveyFill, getSurveyFill } from '@/features/surveys/services/surveys.api';

/**
 * Pengisian survei lewat tautan/QR — melayani DUA keadaan dengan satu tautan.
 *
 * - Ada sesi     -> endpoint berpenjaga; jawaban tercatat atas nama pengguna dan
 *                   anti-duplikat `dedupeUserId` tetap berlaku seperti sekarang.
 * - Tak ada sesi -> endpoint publik; jawaban tercatat `userId: null`.
 *
 * Rute ini SENGAJA berada di luar `config.matcher` milik proxy.js (yang hanya
 * mencantumkan '/', '/pilih-peran', '/persetujuan', '/admin-kab/*',
 * '/admin-opd/*', '/dashboard', '/complaints', '/surveys', '/profile'). Karena
 * '/isi/*' tak termasuk, proxy tidak berjalan di sini dan pengunjung tanpa sesi
 * tidak dipantulkan ke '/' — tanpa satu pun perubahan pada proxy.js. JANGAN
 * menambahkan '/isi' ke matcher: itu justru mengembalikan pantulan yang rute
 * ini ada untuk menghindarinya.
 *
 * Ada-tidaknya sesi ditentukan SEKALI saat render pertama lalu dibawa ke store,
 * bukan diperiksa ulang saat mengirim: sesi yang kedaluwarsa di tengah
 * pengisian tak boleh membuat jawaban berpindah jalur tanpa sebab yang jelas.
 * `isAuthenticated()` sudah menjaga SSR sendiri (mengembalikan false di server).
 */
export default function IsiSurveiPage() {
  const { id } = useParams();
  const { isCompleted, initSurvey, resetSurvey } = useSurveyStore();

  // Dihitung lewat inisialisasi useState, BUKAN di dalam useEffect: menyetel
  // state dari dalam effect memicu render berjenjang dan dilanggar aturan
  // react-hooks/set-state-in-effect (catatan sama di ShareSurveyModal.jsx).
  const [adaSesi] = useState(() => isAuthenticated());
  const [ditandaiPeramban] = useState(() =>
    isAuthenticated() ? false : sudahMengisiDiPeramban(id),
  );

  // Penanda peramban diperiksa DI DALAM fetcher, sebelum satu permintaan pun
  // dikirim: memuat kuesioner yang pasti ditolak di antarmuka hanya memboroskan
  // permintaan dan sempat memperlihatkan formulir yang lalu hilang.
  //
  // Bukan `useAsync(null)`: hook itu memanggil `asyncFn()` tanpa syarat saat
  // mount (useAsync.js), jadi nilai selain fungsi akan melempar. Hook itu
  // dipakai puluhan tempat — jangan diubah untuk rute ini.
  const fetchFill = useCallback(() => {
    if (ditandaiPeramban) return Promise.resolve(null);
    return adaSesi ? getSurveyFill(id) : getPublicSurveyFill(id);
  }, [adaSesi, ditandaiPeramban, id]);
  const { data: fillData, isLoading, error, refetch } = useAsync(fetchFill);

  useEffect(() => {
    if (fillData && !fillData.sudahMengisi) {
      initSurvey(fillData, { anonim: !adaSesi });
    }
    return () => {
      resetSurvey();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillData]);

  const wadah = 'max-w-container-max mx-auto py-8 sm:py-12 px-4 sm:px-6';

  if (ditandaiPeramban || fillData?.sudahMengisi) {
    return (
      <main className={wadah}>
        <EmptyState
          icon={<CheckCircle2 size={64} />}
          title="Anda Sudah Mengisi Survei Ini"
          description="Terima kasih atas partisipasi Anda. Survei ini hanya menerima satu jawaban dari perangkat ini."
          action={
            <Link href="/">
              <button className="px-6 py-3 rounded-xl bg-primary text-white font-bold hover:bg-primary-hover transition-colors">
                Kembali ke Beranda
              </button>
            </Link>
          }
        />
      </main>
    );
  }

  if (isLoading) {
    return (
      <main className={wadah}>
        <LoadingState label="Memuat survei..." />
      </main>
    );
  }

  if (error) {
    return (
      <main className={wadah}>
        <ErrorState
          title="Survei tidak dapat diisi"
          description={error.message}
          onRetry={refetch}
        />
      </main>
    );
  }

  return (
    <main className={`${wadah} min-h-[calc(100vh-64px)] relative`}>
      {isCompleted ? (
        // Tautan "Daftar Survei"/"Dashboard" pada tampilan selesai menuju rute
        // khusus `responden`; pengunjung tanpa sesi akan dipantulkan proxy ke
        // '/'. Karena itu bagi mereka keduanya diganti satu tautan beranda —
        // jalan buntu adalah cacat, bukan detail kosmetik.
        <SurveyCompletion tampilkanTautanWarga={adaSesi} />
      ) : (
        <div className="w-full max-w-[800px] mx-auto">
          <SurveyProgress />

          <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 p-5 sm:p-8 md:p-10 border border-outline-variant/20">
            <QuestionCard />
            <SurveyNavigation />
          </div>
        </div>
      )}
    </main>
  );
}
