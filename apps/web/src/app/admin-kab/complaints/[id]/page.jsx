'use client';

import React, { useMemo, use } from 'react';
import { notFound } from 'next/navigation';
import ComplaintDetailHeader from '@/features/complaints/components/admin-kab/ComplaintDetailHeader';
import ComplaintSummaryCard from '@/features/complaints/components/admin-kab/ComplaintSummaryCard';
import ComplaintContentCard from '@/features/complaints/components/admin-kab/ComplaintContentCard';
import ComplaintHandlingInfoCard from '@/features/complaints/components/admin-kab/ComplaintHandlingInfoCard';
import ComplaintDetailTimeline from '@/features/complaints/components/admin-kab/ComplaintDetailTimeline';
import ComplaintResponseHistory from '@/features/complaints/components/admin-kab/ComplaintResponseHistory';
import ComplaintSLAMonitor from '@/features/complaints/components/admin-kab/ComplaintSLAMonitor';
import ComplaintStatisticsCard from '@/features/complaints/components/admin-kab/ComplaintStatisticsCard';
import ComplaintAttachmentGallery from '@/features/complaints/components/admin-kab/ComplaintAttachmentGallery';
import { dummyComplaintsKabupaten } from '@/features/complaints/constants/dummyComplaintsKabupaten';

export default function AdminKabComplaintDetailPage({ params }) {
  const resolvedParams = use(params);
  const { id } = resolvedParams;

  const complaint = useMemo(() => {
    return dummyComplaintsKabupaten.find(c => c.id === id);
  }, [id]);

  if (!complaint) {
    notFound();
  }

  return (
    <div className="p-lg w-full max-w-6xl mx-auto space-y-md pb-24">
      
      {/* Action Header & Title */}
      <ComplaintDetailHeader complaint={complaint} />

      {/* Main Grid Layout: 2/3 Left (Content), 1/3 Right (Monitoring) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        
        {/* Kolom Kiri: Konten Substantif */}
        <div className="lg:col-span-2 space-y-md">
          <ComplaintSummaryCard complaint={complaint} />
          <ComplaintContentCard complaint={complaint} />
          <ComplaintAttachmentGallery complaint={complaint} />
          <ComplaintResponseHistory complaint={complaint} />
        </div>

        {/* Kolom Kanan: Monitoring & SLA (Manajerial) */}
        <div className="lg:col-span-1 space-y-md">
          <ComplaintSLAMonitor complaint={complaint} />
          <ComplaintHandlingInfoCard complaint={complaint} />
          <ComplaintStatisticsCard complaint={complaint} />
          <ComplaintDetailTimeline complaint={complaint} />
        </div>
        
      </div>
    </div>
  );
}
