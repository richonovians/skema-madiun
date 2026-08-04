import { formatDateId, getInitials } from '@/utils/format';

/**
 * Terjemahkan ComplaintEntity backend (GET /complaints) ke bentuk yang dipakai
 * komponen (lihat features/complaints/constants/dummyComplaints.js). Satu tempat
 * -- perubahan kontrak backend cukup diubah di sini (INT-6).
 *
 * CATATAN GAP BESAR: dummyComplaintsKabupaten.js (tampilan detail) mengharapkan
 * banyak field yang SAMA SEKALI TIDAK ADA di backend saat ini -- ini BUKAN
 * masalah penamaan yang bisa diselesaikan adapter, tapi kapasitas backend yang
 * belum dibangun:
 *   - progress, priority, kecamatan, chronology, sla{...}, stats{...}, timeline[]
 *     -> tidak ada konsep ini sama sekali di skema Complaint/ComplaintReply.
 *   - opd.name / opd.pic -> ComplaintEntity tidak punya opdNama (beda dari
 *     reporterNama yang sudah ditambah INT-11); OpdEntity.penanggungJawab ada
 *     tapi perlu join terpisah yang belum diekspos di endpoint pengaduan.
 * Adapter ini SENGAJA tidak mengarang nilai untuk field-field itu -- komponen
 * yang menampilkannya perlu backend baru dulu (bukan tugas adapter frontend).
 */
const STATUS_MAP = {
  diterima: 'Diterima',
  diproses: 'Diproses',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
};

export function adaptComplaint(complaint) {
  const createdAt = complaint.createdAt;
  const ageDays = createdAt
    ? Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000)
    : null;

  return {
    id: complaint.ticketNo,
    reporter: {
      name: complaint.reporterNama ?? null,
      initials: complaint.reporterNama ? getInitials(complaint.reporterNama) : '',
    },
    title: complaint.judul,
    description: complaint.uraian,
    dateStr: formatDateId(createdAt),
    createdAt,
    ageDays,
    status: STATUS_MAP[complaint.status] ?? complaint.status,
    // Kode kategori mentah (mis. 'infrastruktur') -- label ramah-baca perlu
    // di-cross-reference terpisah ke GET /ref/complaint-categories, di luar
    // tanggung jawab adapter sinkron ini.
    kategori: complaint.kategori,
    attachments: (complaint.attachments ?? []).map((a) => ({
      id: a.id,
      url: a.fileUrl,
      mimeType: a.mimeType,
      sizeBytes: a.sizeBytes,
    })),
  };
}

export function adaptComplaintList(complaints) {
  return complaints.map(adaptComplaint);
}

/**
 * Terjemahkan ComplaintReplyEntity (GET /complaints/:id/replies).
 * CATATAN GAP: backend hanya punya `authorId` (angka), TIDAK ada nama/role
 * pengirim -- dummy responseHistory mengharapkan `sender`/`role` label. Field
 * itu diisi null di sini, bukan ditebak; perlu enrichment backend (join User)
 * yang belum ada di ComplaintReplyEntity.
 */
export function adaptComplaintReply(reply) {
  return {
    id: reply.id,
    authorId: reply.authorId,
    sender: null,
    role: null,
    text: reply.pesan,
    timestamp: reply.createdAt,
  };
}

export function adaptComplaintReplyList(replies) {
  return replies.map(adaptComplaintReply);
}
