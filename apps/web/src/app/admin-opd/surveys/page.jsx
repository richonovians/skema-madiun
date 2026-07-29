'use client';

import React, { useState } from 'react';
import SurveyPageHeader from '@/features/surveys/components/SurveyPageHeader';
import SurveyTabs from '@/features/surveys/components/SurveyTabs';
import AdminSurveyCardList from '@/features/surveys/components/AdminSurveyCardList';
import { DUMMY_SURVEYS } from '@/features/surveys/data/dummySurveys';

export default function AdminSurveysPage() {
  const [activeTab, setActiveTab] = useState('all');
  const [surveys, setSurveys] = useState(DUMMY_SURVEYS);

  // Toggle survey period status optimistically
  const handleTogglePeriod = (surveyId, newIsClosed) => {
    setSurveys((prev) => 
      prev.map(survey => 
        survey.id === surveyId 
          ? { ...survey, isClosed: newIsClosed }
          : survey
      )
    );
    // TODO: Connect to PUT /api/v1/admin-opd/surveys/{id} here
  };

  // Filter surveys based on active tab
  const filteredSurveys = surveys.filter(survey => {
    if (activeTab === 'all') return true;
    if (activeTab === 'active') return survey.status === 'AKTIF';
    if (activeTab === 'draft') return survey.status === 'DRAF';
    if (activeTab === 'closed') return survey.status === 'DITUTUP';
    return true;
  });

  return (
    <div className="w-full">
      <SurveyPageHeader />
      <SurveyTabs 
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <AdminSurveyCardList 
        surveys={filteredSurveys}
        onTogglePeriod={handleTogglePeriod}
      />
    </div>
  );
}
