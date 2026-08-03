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

  // Duplicate a survey and place it right below the original
  const handleDuplicateSurvey = (surveyId) => {
    setSurveys((prev) => {
      const index = prev.findIndex(s => s.id === surveyId);
      if (index === -1) return prev;
      
      const original = prev[index];
      const duplicated = {
        ...original,
        id: `srv-${Date.now()}`,
        title: original.title,
        status: 'DRAF',
        isClosed: false,
        respondentsCount: 0,
        ikmScore: 0,
      };
      
      const newSurveys = [...prev];
      newSurveys.splice(index + 1, 0, duplicated);
      return newSurveys;
    });
  };

  // Delete a survey (only allowed for Drafts usually, handled in UI)
  const handleDeleteSurvey = (surveyId) => {
    setSurveys((prev) => prev.filter(s => s.id !== surveyId));
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
        onDuplicate={handleDuplicateSurvey}
        onDelete={handleDeleteSurvey}
      />
    </div>
  );
}
