'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';
import ComplaintDetailHeader from '@/features/complaints/components/admin-kab/ComplaintDetailHeader';
import ComplaintSummaryCard from '@/features/complaints/components/admin-kab/ComplaintSummaryCard';
import ComplaintContentCard from '@/features/complaints/components/admin-kab/ComplaintContentCard';
import ComplaintAttachmentGallery from '@/features/complaints/components/admin-kab/ComplaintAttachmentGallery';
import ComplaintReporterProfile from '@/features/complaints/components/ComplaintReporterProfile';
import ComplaintProgressStepper from '@/features/complaints/components/ComplaintProgressStepper';
import ComplaintStatusControl from '@/features/complaints/components/ComplaintStatusControl';
import ConfirmStatusModal from '@/components/ui/ConfirmStatusModal';
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
import { getComplaintCategories } from '@/features/complaints/services/reference.api';
import {
  adaptComplaintReplyToChatMessage,
  toBackendComplaintStatus,
} from '@/features/complaints/adapters/complaint.adapter';

function formatFileSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Terjemahkan attachment asli (adaptComplaintAttachment) ke bentuk yang
 * diharapkan ComplaintAttachmentGallery (dibangun dgn kontrak dummy lama) --
 * lokal di sini krn kontraknya spesifik utk komponen ini, bukan tanggung
 * jawab adapter sinkron bersama.
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

/**
 * Kabupaten (= superuser, akses penuh) SEKARANG bisa balas & ubah status
 * tiket (2026-08-06, laporan bug user: "admin kab tidak mempunyai akses
 * untuk melihat/membuka tiket ... padahal setara superuser") -- SEBELUMNYA
 * halaman ini murni "Mode pengawasan eksekutif (Read-Only)" (ComplaintResponseHistory
 * tanpa form balasan sama sekali), padahal backend (RolesGuard) SUDAH SEJAK
 * AWAL mengizinkan kabupaten membalas/mengubah status APAPUN (bypass penuh
 * @Roles, lihat roles.guard.ts + e2e "POST replies oleh Admin Kabupaten ->
 * 201") -- gap murni di frontend, bukan backend. Reuse `ComplaintStatusControl`
 * + `AdminResolutionWorkspace` (komponen sama yg dipakai admin-opd, sudah
 * generik/tak ada string ter-hardcode "OPD", sudah teruji dgn lampiran chat
 * di sesi yg sama) drpd membangun ulang alur balasan dari nol.
 */
export default function AdminKabComplaintDetailPage() {
  const params = useParams();
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
      adaptComplaintReplyToChatMessage(r, { isAnonim: complaint.isAnonim }),
    );
    return { complaint, chatHistory, categories };
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
    if (!data || (!text?.trim() && !file)) return;
    setActionError(null);
    // Galat pengiriman TIDAK ditangkap di sini. Spanduk galat halaman berada di
    // puncak, jauh di luar pandangan admin yang sedang berada di kolom balasan,
    // sehingga kegagalan lewat tanpa terlihat. AdminResolutionWorkspace yang
    // menangkapnya, menahan teks yang sudah diketik, dan menampilkan sebabnya
    // tepat di atas tombol kirim.
    await addComplaintReply(data.complaint.numericId, text, file ? [file] : []);
    await refetch();
  };

  const handleCloseTicket = () => {
    if (!data) return;
    setActionError(null);

    if (data.complaint.status !== 'Diproses') {
      setActionError(
        'Tiket harus berstatus "Diproses" sebelum bisa ditutup. Ubah status terlebih dahulu.',
      );
      return;
    }

    // Buka ConfirmStatusModal -- konfirmasi & pemanggilan API ditangani oleh
    // handleConfirmStatus yang sudah terpasang di modal, pola sama admin-opd.
    setPendingStatus('Selesai');
  };

  // Pemuat penuh HANYA saat belum ada yang bisa ditampilkan. Pada muat ulang
  // sesudah balasan terkirim, isi halaman dibiarkan terpasang: menggantinya
  // dengan pemuat meruntuhkan tinggi dokumen, dan peramban menjepit posisi
  // gulir ke nol -- admin terlempar ke puncak halaman tiap kali membalas.
  if (isLoading && !data) {
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
      <ComplaintDetailHeader complaint={complaintView} chatHistory={data.chatHistory} />

      {actionError && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700">
          <AlertTriangle size={16} className="mt-0.5 flex-shrink-0" />
          <p className="text-sm font-medium">{actionError}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        <div className="lg:col-span-2 space-y-md">
          <ComplaintSummaryCard complaint={complaintView} />
          <ComplaintContentCard complaint={complaintView} />
          <ComplaintAttachmentGallery complaint={{ attachments }} />
          <AdminResolutionWorkspace
            currentStatus={complaintView.status}
            chatHistory={data.chatHistory}
            onSendUpdate={handleSendUpdate}
            onCloseTicket={handleCloseTicket}
          />
        </div>

        <div className="lg:col-span-1 space-y-md">
          <ComplaintReporterProfile reporter={complaintView.reporter} />
          <ComplaintProgressStepper currentStatus={toBackendComplaintStatus(complaintView.status)} />
          <ComplaintStatusControl
            currentStatus={complaintView.status}
            onStatusChangeRequest={handleStatusChangeRequest}
          />
        </div>
      </div>

      {data && (
        <ConfirmStatusModal
          isOpen={!!pendingStatus}
          fromStatus={complaintView.status}
          toStatus={pendingStatus ?? ''}
          requireReason={pendingStatus === 'Ditolak'}
          onConfirm={handleConfirmStatus}
          onCancel={handleCancelStatus}
        />
      )}
    </div>
  );
}
