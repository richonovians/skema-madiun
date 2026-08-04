'use client';
import React, { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import ComplaintReporterProfile from '@/features/complaints/components/ComplaintReporterProfile';
import ComplaintStatusControl from '@/features/complaints/components/ComplaintStatusControl';
import ComplaintAttachments from '@/features/complaints/components/ComplaintAttachments';
import AdminResolutionWorkspace from '@/features/complaints/components/AdminResolutionWorkspace';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import {
  getComplaintByTicketNo,
  getComplaintReplies,
  addComplaintReply,
  updateComplaintStatus,
} from '@/features/complaints/services/complaints.api';
import { adaptComplaintReplyToChatMessage } from '@/features/complaints/adapters/complaint.adapter';

export default function AdminComplaintDetailPage() {
  const params = useParams();
  // Tiket dari AdminComplaintTable.jsx sudah ticketNo asli (uppercase, lihat
  // generateTicketNo backend) -- toUpperCase() cuma jaga-jaga defensif kalau
  // user ketik URL manual huruf kecil (pola sama halaman responden, INT-18).
  const ticketNo = (params?.id || '').toUpperCase();
  const [actionError, setActionError] = useState(null);

  const fetchDetail = useCallback(async () => {
    const complaint = await getComplaintByTicketNo(ticketNo);
    const rawReplies = await getComplaintReplies(complaint.numericId);
    const chatHistory = rawReplies.map((r) =>
      adaptComplaintReplyToChatMessage(r, complaint.userId),
    );
    return { complaint, chatHistory };
  }, [ticketNo]);

  const { data, isLoading, error, refetch } = useAsync(fetchDetail);

  const handleStatusChange = async (newStatus) => {
    if (!data || newStatus === data.complaint.status) return;
    setActionError(null);

    let catatan;
    if (newStatus === 'Ditolak') {
      // Backend WAJIB catatan/alasan saat status=ditolak (UpdateComplaintStatusDto)
      // -- belum ada modal khusus di desain ini, window.prompt cukup utk MVP.
      catatan = window.prompt('Alasan penolakan (wajib diisi):');
      if (!catatan || !catatan.trim()) return;
    }

    try {
      await updateComplaintStatus(data.complaint.numericId, newStatus, catatan);
      await refetch();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleSendUpdate = async (text) => {
    if (!data || !text || !text.trim()) return;
    setActionError(null);
    try {
      await addComplaintReply(data.complaint.numericId, text);
      await refetch();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleCloseTicket = async () => {
    if (!data) return;
    setActionError(null);

    // Backend hanya izinkan Diproses -> Selesai (ALLOWED_TRANSITIONS) -- kalau
    // tiket masih Diterima, tolak di sini dgn pesan jelas dulu ke pengguna,
    // bukan biarkan gagal 400 mentah (pola sama assertDraftOrThrow, INT-19).
    if (data.complaint.status !== 'Diproses') {
      setActionError(
        'Tiket harus berstatus "Diproses" sebelum bisa ditutup. Ubah status terlebih dahulu.',
      );
      return;
    }

    try {
      await updateComplaintStatus(
        data.complaint.numericId,
        'Selesai',
        'Tiket ini telah ditutup karena masalah sudah diselesaikan.',
      );
      await refetch();
    } catch (err) {
      setActionError(err.message);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <div className="mb-lg mt-lg flex items-center gap-md">
        <Link
          href="/admin-opd/complaints"
          className="p-2 bg-surface text-on-surface-variant hover:text-primary hover:bg-primary/10 rounded-full transition-all border border-border"
        >
          <ArrowLeft size={20} />
        </Link>
        <h2 className="font-headline-md text-headline-md font-black text-on-surface tracking-tight">
          Detail Pengaduan #{ticketNo}
        </h2>
      </div>

      {isLoading ? (
        <LoadingState label="Memuat detail pengaduan..." />
      ) : error ? (
        <ErrorState title="Gagal memuat pengaduan" description={error.message} onRetry={refetch} />
      ) : (
        <>
          {actionError && (
            <div className="mb-lg container-max flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
              <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium">{actionError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg container-max">
            <div className="lg:col-span-4 space-y-lg">
              <ComplaintReporterProfile reporter={data.complaint.reporter} />
              <ComplaintStatusControl
                currentStatus={data.complaint.status}
                onStatusChange={handleStatusChange}
              />
              <ComplaintAttachments attachments={data.complaint.attachments} />
            </div>

            <div className="lg:col-span-8">
              <AdminResolutionWorkspace
                chatHistory={data.chatHistory}
                onSendUpdate={handleSendUpdate}
                onCloseTicket={handleCloseTicket}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
