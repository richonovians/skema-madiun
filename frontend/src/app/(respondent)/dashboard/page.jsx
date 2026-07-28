import React from 'react';
import WelcomeHeader from '@/features/dashboards/components/WelcomeHeader';
import RecentComplaintWidget from '@/features/complaints/components/RecentComplaintWidget';
import AvailableSurveysWidget from '@/features/surveys/components/AvailableSurveysWidget';
import ActivityHistoryTable from '@/features/dashboards/components/ActivityHistoryTable';

export const metadata = {
  title: 'Dashboard - SKEMA Madiun',
};

export default function RespondentDashboard() {
  return (
    <main className="max-w-[1280px] mx-auto py-8 px-4 sm:px-6 space-y-8 w-full">
      <WelcomeHeader />
      <RecentComplaintWidget />
      <AvailableSurveysWidget />
      <ActivityHistoryTable />
    </main>
  );
}
