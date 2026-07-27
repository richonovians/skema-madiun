'use client';
import React from 'react';
import KabDashboardHeader from '@/features/dashboard/components/kabupaten/KabDashboardHeader';
import KabSummaryMetrics from '@/features/dashboard/components/kabupaten/KabSummaryMetrics';
import IkmLeaderboard from '@/features/dashboard/components/kabupaten/IkmLeaderboard';
import ComplaintStatusDonut from '@/features/dashboard/components/kabupaten/ComplaintStatusDonut';
import RecentActivities from '@/features/dashboard/components/kabupaten/RecentActivities';

import {
  fetchSummaryMetrics,
  fetchIkmLeaderboard,
  fetchComplaintDistribution,
  fetchRecentActivities
} from '@/features/dashboard/constants/kabDashboardData';

import { useSearchParams } from 'next/navigation';

export default function AdminKabDashboardPage() {
  const searchParams = useSearchParams();
  const filters = {
    year: searchParams.get('year') || '2024',
    service: searchParams.get('service') || 'all'
  };

  // Simulated data fetching based on filters
  const summaryData = fetchSummaryMetrics(filters.year, filters.service);
  const leaderboardData = fetchIkmLeaderboard(filters.year, filters.service);
  const complaintData = fetchComplaintDistribution(filters.year, filters.service);
  const activitiesData = fetchRecentActivities(filters.year, filters.service);

  return (
    <div className="min-h-screen p-lg space-y-lg relative">
      <KabDashboardHeader filters={filters} />
      <KabSummaryMetrics data={summaryData} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <IkmLeaderboard data={leaderboardData} />
        <ComplaintStatusDonut data={complaintData} />
      </div>

      <RecentActivities data={activitiesData} />
    </div>
  );
}
