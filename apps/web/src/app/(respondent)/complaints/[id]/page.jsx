'use client';

import React, { useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Breadcrumb from '@/components/ui/Breadcrumb';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import ComplaintInfoCard from '@/features/complaints/components/ComplaintInfoCard';
import ComplaintProgressStepper from '@/features/complaints/components/ComplaintProgressStepper';
import ComplaintAttachments from '@/features/complaints/components/ComplaintAttachments';
import ComplaintChatSection from '@/features/complaints/components/ComplaintChatSection';
import ComplaintContentCard from '@/features/complaints/components/admin-kab/ComplaintContentCard';
import ComplaintSummaryCard from '@/features/complaints/components/admin-kab/ComplaintSummaryCard';
import { useAsync } from '@/hooks/useAsync';
import { getComplaintByTicketNo, getComplaintReplies, addComplaintReply } from '@/features/complaints/services/complaints.api';
import { getComplaintCategories } from '@/features/complaints/services/reference.api';
import { adaptComplaintReplyToChatMessage } from '@/features/complaints/adapters/complaint.adapter';

// Avatar dekoratif -- tak ada API terpisah utk identitas 2 pihak percakapan
// (pelapor & Admin OPD), lihat catatan gap di complaint.adapter.js soal
// ComplaintReplyEntity yg cuma py authorId. Cukup generik, bukan cerminan
// data sungguhan per pesan.
const CHAT_PARTICIPANTS = [
  { initials: 'AN', variant: 'primary' },
  { initials: 'AD', variant: 'secondary' },
];

export default function ComplaintDetailPage() {
  const params = useParams();
  // URL selalu lowercase (lihat ComplaintRow.jsx: id.toLowerCase()), tapi
  // ticketNo backend generateTicketNo() selalu UPPERCASE -- konversi di sini
  // sebelum query, krn perbandingan string Postgres case-sensitive.
  const ticketNo = (params?.id || '').toUpperCase();

  const fetchDetail = useCallback(async () => {
    const complaint = await getComplaintByTicketNo(ticketNo);
    const [rawReplies, categories] = await Promise.all([
      getComplaintReplies(complaint.numericId),
      getComplaintCategories(),
    ]);
    const chatHistory = rawReplies.map((r) => adaptComplaintReplyToChatMessage(r, complaint.userId));
    return { complaint, chatHistory, categories };
  }, [ticketNo]);

  const { data, isLoading, error, refetch } = useAsync(fetchDetail);

  const breadcrumbItems = [
    { label: 'Beranda', href: '/dashboard' },
    { label: 'Daftar Pengaduan', href: '/complaints' },
    { label: 'Detail', active: true },
  ];

  const handleSendReply = async (text, file) => {
    const reply = await addComplaintReply(data.complaint.numericId, text, file ? [file] : []);
    return adaptComplaintReplyToChatMessage(reply, data.complaint.userId);
  };

  return (
    <main className="max-w-container-max w-full mx-auto px-4 sm:px-6 md:px-8 py-6 sm:py-10 md:py-12">
      <div className="mb-6 sm:mb-8 space-y-4">
        <div>
          <Link
            href="/complaints"
            className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-white border border-slate-200 text-slate-500 hover:text-primary hover:border-primary hover:bg-primary/5 transition-all shadow-sm group"
            aria-label="Kembali ke Daftar Pengaduan"
            title="Kembali ke Daftar Pengaduan"
          >
            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
          </Link>
        </div>
        <Breadcrumb items={breadcrumbItems} />
      </div>

      {isLoading ? (
        <LoadingState label="Memuat detail pengaduan..." />
      ) : error ? (
        <ErrorState title="Gagal memuat pengaduan" description={error.message} onRetry={refetch} />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 sm:gap-8 h-full">
          <aside className="md:col-span-4 space-y-6 sm:space-y-8">
            <ComplaintInfoCard
              ticketId={data.complaint.id}
              date={data.complaint.dateStr}
              target={data.complaint.target}
              status={data.complaint.status}
            />
            <ComplaintProgressStepper currentStatus={data.complaint.status} />
            <ComplaintAttachments attachments={data.complaint.attachments} />
          </aside>

          <div className="md:col-span-8 flex flex-col gap-6 sm:gap-8">
            {/* Ringkasan & Isi Pengaduan -- ditambahkan agar warga juga
                dapat melihat kembali konteks laporan yang mereka kirimkan
                (judul, kategori, OPD tujuan, deskripsi) sebelum melihat
                histori percakapan dengan admin. */}
            <ComplaintSummaryCard
              complaint={{
                ...data.complaint,
                categoryLabel:
                  (data.categories ?? []).find(
                    (c) => c.kode === data.complaint.kategori,
                  )?.nama ?? data.complaint.kategori,
              }}
            />
            <ComplaintContentCard complaint={data.complaint} />
            <ComplaintChatSection
              initialMessages={data.chatHistory}
              participants={CHAT_PARTICIPANTS}
              onSendReply={handleSendReply}
            />
          </div>
        </div>
      )}
    </main>
  );
}
