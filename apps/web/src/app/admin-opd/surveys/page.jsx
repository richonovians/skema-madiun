'use client';

import React, { useCallback, useState } from 'react';
import SurveyPageHeader from '@/features/surveys/components/SurveyPageHeader';
import SurveyTabs from '@/features/surveys/components/SurveyTabs';
import AdminSurveyCardList from '@/features/surveys/components/AdminSurveyCardList';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getSurveys, updateSurveyStatus, duplicateSurvey, deleteSurvey } from '@/features/surveys/services/surveys.api';

export default function AdminSurveysPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [actionError, setActionError] = useState(null);

  // Superuser yang masuk sebagai Admin OPD untuk SATU OPD (lihat
  // Penyaring `?opdId=` DIBUANG 5 September 2026. Dulu diperlukan karena
  // superuser bisa "memerankan" OPD mana pun sementara backend memberinya
  // cakupan penuh, jadi daftarnya harus dipersempit dari sisi klien. Sekarang
  // hak mengikuti peran yang DIPAKAI: siapa pun yang membuka area ini sedang
  // bertindak sebagai `opd`, dan backend menurunkan instansinya sendiri dari
  // `users.opd_id` (opd-scope.util.ts). Mengirimnya dari klien hanya menambah
  // sumber kebenaran kedua yang bisa basi.
  const fetchSurveys = useCallback(() => getSurveys({ limit: 100 }), []);
  const { data: response, isLoading, error, refetch } = useAsync(fetchSurveys);
  const surveys = response?.data ?? [];

  // Ubah status survei (AKTIF ↔ DITUTUP) -- dua arah, backend kini izinkan
  // DITUTUP -> AKTIF (buka kembali). Setiap perubahan dikonfirmasi via modal.
  const handleChangeStatus = async (surveyId, newStatus) => {
    setActionError(null);
    try {
      await updateSurveyStatus(surveyId, newStatus);
      refetch();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDuplicateSurvey = async (surveyId) => {
    setActionError(null);
    try {
      await duplicateSurvey(surveyId);
      refetch();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleDeleteSurvey = async (surveyId) => {
    setActionError(null);
    try {
      await deleteSurvey(surveyId);
      refetch();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const filteredSurveys = surveys.filter((survey) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return survey.status === 'AKTIF';
    if (activeTab === 'draft') return survey.status === 'DRAF';
    if (activeTab === 'closed') return survey.status === 'DITUTUP';
    return true;
  });

  return (
    <div className="w-full">
      <SurveyPageHeader surveys={filteredSurveys} />
      <SurveyTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {actionError && (
        <div className="mb-lg p-md rounded-xl bg-error-container text-on-error-container text-sm font-semibold">
          {actionError}
        </div>
      )}

      {isLoading ? (
        <LoadingState label="Memuat daftar survei..." />
      ) : error ? (
        <ErrorState title="Gagal memuat survei" description={error.message} onRetry={refetch} />
      ) : (
        <AdminSurveyCardList
          surveys={filteredSurveys}
          onChangeStatus={handleChangeStatus}
          onDuplicate={handleDuplicateSurvey}
          onDelete={handleDeleteSurvey}
        />
      )}
    </div>
  );
}
