'use client';
import React, { useState } from 'react';
import AnalyticsTabs from '@/features/analytics/components/AnalyticsTabs';
import SkmAnalysisView from '@/features/analytics/components/SkmAnalysisView';
import ComplaintAnalysisView from '@/features/analytics/components/ComplaintAnalysisView';

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('skm');
  const [filters, setFilters] = useState({
    year: '2026',
    month: 'all',
    service: 'all'
  });

  const tabs = [
    { id: 'skm', label: 'Analisis SKM' },
    { id: 'complaints', label: 'Analisis Pengaduan' }
  ];

  return (
    <div className="w-full min-w-0 max-w-container-max mx-auto flex-1 flex flex-col">
        <AnalyticsTabs 
          tabs={tabs} 
          activeTab={activeTab} 
          onChange={setActiveTab} 
        />
        
        <div className="flex-1 mt-4">
          {activeTab === 'skm' ? <SkmAnalysisView /> : <ComplaintAnalysisView />}
        </div>
      </div>
  );
}
