'use client';

import React, { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import SurveyBuilderScreen from '@/features/surveys/builder/components/SurveyBuilderScreen';

// Satu janji tetap: `use()` menolak janji yang lahir baru pada tiap render.
const TANPA_ISIAN = Promise.resolve({});

/**
 * Builder survei untuk Admin Kabupaten -- komponen yang SAMA dengan builder
 * Admin OPD (satu implementasi di features/surveys/builder), hanya berbeda
 * `listHref` supaya tombol kembali & redirect setelah publikasi tetap berada
 * di area /admin-kab, bukan melempar pengguna ke halaman Admin OPD.
 *
 * Segmen statis `builder` menang atas segmen dinamis `[id]` di App Router,
 * jadi rute ini tidak bertabrakan dengan /admin-kab/surveys/[id] (detail hasil).
 *
 * SURVEI BARU (30 Oktober 2026, permintaan pengguna): modal Buat Paket Survei
 * mengantar ke `new?opd=&judul=&periode=&anonim=`, lalu halaman jenis survei
 * builder tampil seperti pada Admin OPD. Admin Kabupaten tak punya OPD sendiri,
 * jadi tanpa `opd` backend pasti menolak pembuatannya; halaman ini kembali ke
 * daftar alih-alih menawarkan pilihan yang pasti gagal.
 */
export default function AdminKabSurveyBuilderPage({ params, searchParams }) {
  const { id } = use(params);
  const isian = use(searchParams ?? TANPA_ISIAN) ?? {};
  const router = useRouter();
  const tanpaOpd = id === 'new' && !isian.opd;

  useEffect(() => {
    if (tanpaOpd) router.replace('/admin-kab/surveys');
  }, [tanpaOpd, router]);

  if (tanpaOpd) return null;

  const nilaiAwal =
    id === 'new'
      ? {
          opdId: Number(isian.opd),
          title: isian.judul,
          periode: isian.periode,
          izinkanAnonim: isian.anonim === '1',
        }
      : null;

  return (
    <SurveyBuilderScreen surveyId={id} listHref="/admin-kab/surveys" nilaiAwal={nilaiAwal} />
  );
}
