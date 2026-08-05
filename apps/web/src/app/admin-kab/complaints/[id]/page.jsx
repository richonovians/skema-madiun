'use client';

import React, { useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import ComplaintDetailHeader from '@/features/complaints/components/admin-kab/ComplaintDetailHeader';
import ComplaintSummaryCard from '@/features/complaints/components/admin-kab/ComplaintSummaryCard';
import ComplaintContentCard from '@/features/complaints/components/admin-kab/ComplaintContentCard';
import ComplaintResponseHistory from '@/features/complaints/components/admin-kab/ComplaintResponseHistory';
import ComplaintAttachmentGallery from '@/features/complaints/components/admin-kab/ComplaintAttachmentGallery';
import ComplaintProgressStepper from '@/features/complaints/components/ComplaintProgressStepper';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import {
  getComplaintByTicketNo,
  getComplaintReplies,
} from '@/features/complaints/services/complaints.api';
import { getComplaintCategories } from '@/features/complaints/services/reference.api';
import { toBackendComplaintStatus } from '@/features/complaints/adapters/complaint.adapter';

function formatFileSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Terjemahkan attachment/reply asli (adaptComplaintAttachment/ComplaintReplyEntity)
 * ke bentuk yang diharapkan komponen admin-kab (dibangun dgn kontrak dummy lama) --
 * lokal di sini krn kontraknya spesifik utk komponen ini, bukan tanggung jawab
 * adapter sinkron bersama.
 */
function toGalleryAttachment(att) {
  return {
    id: att.id,
    name: att.alt,
    type: att.mimeType?.startsWith('image/') ? 'image' : 'document',
    size: formatFileSize(att.sizeBytes),
    url: att.url,
  };
}

function toResponseHistoryItem(reply, complaintUserId) {
  const isReporter = reply.authorId === complaintUserId;
  return {
    id: reply.id,
    sender: isReporter ? 'Pelapor' : 'Admin OPD',
    role: isReporter ? 'Pelapor' : 'Admin OPD',
    text: reply.pesan,
    timestamp: reply.createdAt,
  };
}

export default function AdminKabComplaintDetailPage() {
  const params = useParams();
  const ticketNo = (params?.id || '').toUpperCase();

  const fetchDetail = useCallback(async () => {
    const complaint = await getComplaintByTicketNo(ticketNo);
    const [replies, categories] = await Promise.all([
      getComplaintReplies(complaint.numericId),
      getComplaintCategories(),
    ]);
    return { complaint, replies, categories };
  }, [ticketNo]);

  const { data, isLoading, error, refetch } = useAsync(fetchDetail);

  const complaintView = useMemo(() => {
    if (!data) return null;
    const categoryLabel =
      data.categories.find((c) => c.kode === data.complaint.kategori)?.nama ??
      data.complaint.kategori;
    return { ...data.complaint, categoryLabel };
  }, [data]);

  const attachments = useMemo(
    () => (data?.complaint.attachments ?? []).map(toGalleryAttachment),
    [data],
  );

  const responses = useMemo(
    () => (data?.replies ?? []).map((r) => toResponseHistoryItem(r, data.complaint.userId)),
    [data],
  );

  if (isLoading) {
    return <LoadingState label="Memuat detail pengaduan..." />;
  }

  if (error) {
    return (
      <div className="p-lg w-full max-w-6xl mx-auto">
        <ErrorState title="Gagal memuat pengaduan" description={error.message} onRetry={refetch} />
      </div>
    );
  }

  return (
    <div id="complaint-detail-container" className="p-lg w-full max-w-6xl mx-auto space-y-md pb-24">
      <ComplaintDetailHeader complaint={complaintView} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        <div className="lg:col-span-2 space-y-md">
          <ComplaintSummaryCard complaint={complaintView} />
          <ComplaintContentCard complaint={complaintView} />
          <ComplaintAttachmentGallery complaint={{ attachments }} />
          <ComplaintResponseHistory complaint={{ responseHistory: responses }} />
        </div>

        <div className="lg:col-span-1 space-y-md">
          <ComplaintProgressStepper currentStatus={toBackendComplaintStatus(complaintView.status)} />
        </div>
      </div>
    </div>
  );
}
