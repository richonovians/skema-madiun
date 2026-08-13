'use client';
import React, { useCallback, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, AlertTriangle } from 'lucide-react';
import ComplaintReporterProfile from '@/features/complaints/components/ComplaintReporterProfile';
import ComplaintStatusControl from '@/features/complaints/components/ComplaintStatusControl';
import ConfirmStatusModal from '@/components/ui/ConfirmStatusModal';
import ComplaintAttachments from '@/features/complaints/components/ComplaintAttachments';
import AdminResolutionWorkspace from '@/features/complaints/components/AdminResolutionWorkspace';
import ComplaintContentCard from '@/features/complaints/components/admin-kab/ComplaintContentCard';
import ComplaintSummaryCard from '@/features/complaints/components/admin-kab/ComplaintSummaryCard';
import LoadingState from '@/components/ui/LoadingState';
import ErrorState from '@/components/ui/ErrorState';
import { useAsync } from '@/hooks/useAsync';
import {
  getComplaintByTicketNo,
  getComplaintReplies,
  addComplaintReply,
  updateComplaintStatus,
} from '@/features/complaints/services/complaints.api';
import { getComplaintCategories } from '@/features/complaints/services/reference.api';
import { adaptComplaintReplyToChatMessage } from '@/features/complaints/adapters/complaint.adapter';

export default function AdminComplaintDetailPage() {
  const params = useParams();
  // Tiket dari AdminComplaintTable.jsx sudah ticketNo asli (uppercase, lihat
  // generateTicketNo backend) -- toUpperCase() cuma jaga-jaga defensif kalau
  // user ketik URL manual huruf kecil (pola sama halaman responden, INT-18).
  const ticketNo = (params?.id || '').toUpperCase();
  const [actionError, setActionError] = useState(null);
  const [pendingStatus, setPendingStatus] = useState(null);

  const fetchDetail = useCallback(async () => {
    const complaint = await getComplaintByTicketNo(ticketNo);
    const [rawReplies, categories] = await Promise.all([
      getComplaintReplies(complaint.numericId),
      getComplaintCategories(),
    ]);
    const chatHistory = rawReplies.map((r) =>
      adaptComplaintReplyToChatMessage(r, complaint.userId),
    );
    return { complaint, chatHistory, categories };
  }, [ticketNo]);

  const { data, isLoading, error, refetch } = useAsync(fetchDetail);

  const handleStatusChangeRequest = (newStatus) => {
    if (!data || newStatus === data.complaint.status) return;
    setPendingStatus(newStatus);
  };

  const handleConfirmStatus = async (reason) => {
    if (!data || !pendingStatus) return;
    setActionError(null);

    try {
      await updateComplaintStatus(data.complaint.numericId, pendingStatus, reason);
      await refetch();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setPendingStatus(null);
    }
  };

  const handleCancelStatus = () => {
    setPendingStatus(null);
  };

  const handleSendUpdate = async (text, file) => {
    // Boleh kirim lampiran saja tanpa teks (2026-08-06, laporan bug user
    // "kirim foto tanpa teks tidak terkirim") -- AdminResolutionWorkspace
    // sudah izinkan ini (handleSend: replyText.trim() || attachedFile), TAPI
    // guard di sini masih wajibkan teks, jadi lampiran diam-diam gagal
    // terkirim. Backend (CreateReplyDto) kini terima salah satu.
    if (!data || (!text?.trim() && !file)) return;
    setActionError(null);
    try {
      await addComplaintReply(data.complaint.numericId, text, file ? [file] : []);
      await refetch();
    } catch (err) {
      setActionError(err.message);
    }
  };

  const handleCloseTicket = () => {
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

    // Buka ConfirmStatusModal -- konfirmasi & pemanggilan API ditangani oleh
    // handleConfirmStatus yang sudah terpasang di modal, sama seperti alur
    // perubahan status dari dropdown ComplaintStatusControl.
    setPendingStatus('Selesai');
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
                onStatusChangeRequest={handleStatusChangeRequest}
              />
              <ComplaintAttachments attachments={data.complaint.attachments} />
            </div>

            <div className="lg:col-span-8 space-y-lg">
              {/* Ringkasan & Isi Pengaduan -- ditambahkan agar admin-opd juga
                  dapat melihat konteks laporan (kategori, OPD tujuan, deskripsi)
                  sama seperti tampilan admin-kab. Data sudah tersedia dari
                  fetchDetail; categoryLabel di-resolve dari daftar kategori
                  referensi yang di-fetch bersamaan. */}
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
              <AdminResolutionWorkspace
                currentStatus={data.complaint.status}
                chatHistory={data.chatHistory}
                onSendUpdate={handleSendUpdate}
                onCloseTicket={handleCloseTicket}
              />
            </div>
          </div>

          <ConfirmStatusModal
            isOpen={!!pendingStatus}
            fromStatus={data.complaint.status}
            toStatus={pendingStatus ?? ''}
            requireReason={pendingStatus === 'Ditolak'}
            onConfirm={handleConfirmStatus}
            onCancel={handleCancelStatus}
          />
        </>
      )}
    </div>
  );
}
