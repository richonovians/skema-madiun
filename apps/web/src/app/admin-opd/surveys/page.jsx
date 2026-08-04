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

  const fetchSurveys = useCallback(() => getSurveys({ limit: 100 }), []);
  const { data: response, isLoading, error, refetch } = useAsync(fetchSurveys);
  const surveys = response?.data ?? [];

  // Tutup periode (AKTIF -> DITUTUP) -- SATU ARAH, backend tak izinkan
  // DITUTUP -> AKTIF lagi (penutupan permanen, snapshot IKM sudah diambil
  // saat itu). Toggle "Buka Periode" di AdminSurveyCard.jsx sengaja tak lagi
  // ditampilkan utk survei DITUTUP (lihat perubahan di komponen tsb).
  const handleTogglePeriod = async (surveyId) => {
    setActionError(null);
    try {
      await updateSurveyStatus(surveyId, 'DITUTUP');
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
      <SurveyPageHeader />
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
          onTogglePeriod={handleTogglePeriod}
          onDuplicate={handleDuplicateSurvey}
          onDelete={handleDeleteSurvey}
        />
      )}
    </div>
  );
}
