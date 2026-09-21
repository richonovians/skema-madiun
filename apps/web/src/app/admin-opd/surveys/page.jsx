'use client';

import React, { useCallback, useMemo, useState } from 'react';
import SurveyPageHeader from '@/features/surveys/components/SurveyPageHeader';
import SurveyTabs from '@/features/surveys/components/SurveyTabs';
import AdminSurveyCardList from '@/features/surveys/components/AdminSurveyCardList';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import { getSurveys, updateSurveyStatus, duplicateSurvey, deleteSurvey } from '@/features/surveys/services/surveys.api';
import { Search, X } from 'lucide-react';

export default function AdminSurveysPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  // Ubah status survei (AKTIF â†” DITUTUP) -- dua arah, backend kini izinkan
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

  const filteredSurveys = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return surveys.filter((survey) => {
      const matchTab =
        activeTab === 'all' ||
        (activeTab === 'active' && survey.status === 'AKTIF') ||
        (activeTab === 'draft' && survey.status === 'DRAF') ||
        (activeTab === 'closed' && survey.status === 'DITUTUP');
      const matchSearch =
        !q ||
        survey.title?.toLowerCase().includes(q) ||
        survey.name?.toLowerCase().includes(q);
      return matchTab && matchSearch;
    });
  }, [surveys, activeTab, searchQuery]);

  return (
    <div className="w-full">
      <SurveyPageHeader surveys={filteredSurveys} />
      <SurveyTabs activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Search bar -- mencari berdasarkan judul survei */}
      <div className="mb-lg">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-outline-variant pointer-events-none"
          />
          <input
            id="survey-search-input"
            type="text"
            placeholder="Cari berdasarkan judul survei..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full min-h-[44px] pl-10 pr-10 py-md border border-outline-variant rounded-lg bg-surface focus:ring-2 focus:ring-primary focus:border-primary outline-none transition-all text-body-md"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Hapus pencarian"
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline-variant hover:text-text-primary transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

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
