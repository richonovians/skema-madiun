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
    numericId: complaint.id,
    userId: complaint.userId,
    opdId: complaint.opdId,
    reporter: {
      name: complaint.reporterNama ?? null,
      initials: complaint.reporterNama ? getInitials(complaint.reporterNama) : '',
      // nik/phone/address (dipakai ComplaintReporterProfile.jsx, halaman detail
      // Admin OPD, INT-20): TIDAK ADA sumbernya di backend -- RespondentProfile
      // sengaja cuma demografis IKM, bukan identitas pribadi (lihat gap sama
      // di me.adapter.js, INT-16). Eksplisit null, bukan dikarang; komponen
      // menampilkan '-' untuk field ini.
      nik: null,
      phone: null,
      address: null,
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
    // Nama OPD tujuan (terisi dari GET /complaints maupun /complaints/:ticketNo, INT-18).
    target: complaint.opdNama ?? null,
    attachments: (complaint.attachments ?? []).map(adaptComplaintAttachment),
  };
}

export function adaptComplaintList(complaints) {
  return complaints.map(adaptComplaint);
}

/** Origin API tanpa suffix /api/v1 -- dasar utk URL lampiran statis (INT-18). */
function getFileOrigin() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  return apiUrl.replace(/\/api\/v1\/?$/, '');
}

/**
 * CATATAN GAP: backend TIDAK punya route penyajian file statis untuk `/uploads`
 * (sengaja ditunda -- lihat catatan CMP-2/Routes-List: perlu keputusan apakah
 * penyajian file publik-statis atau lewat endpoint terautentikasi, demi privasi
 * foto bukti pengaduan warga). URL di bawah ini SECARA STRUKTUR benar (origin
 * API + fileUrl backend) sehingga akan langsung berfungsi begitu route statis
 * ditambahkan, TAPI saat ini kemungkinan besar 404 -- bukan bug adapter.
 */
export function adaptComplaintAttachment(attachment) {
  return {
    id: attachment.id,
    url: `${getFileOrigin()}${attachment.fileUrl}`,
    alt: attachment.fileUrl.split('/').pop(),
    mimeType: attachment.mimeType,
    sizeBytes: attachment.sizeBytes,
  };
}

const STATUS_TO_BACKEND = {
  Diterima: 'diterima',
  Diproses: 'diproses',
  Selesai: 'selesai',
  Ditolak: 'ditolak',
};

/** Terjemahkan status frontend ('Diproses' dkk) -> enum backend ('diproses' dkk). */
export function toBackendComplaintStatus(status) {
  return STATUS_TO_BACKEND[status] ?? status;
}

/** Terjemahkan payload form (lihat CreateComplaintForm.jsx) -> CreateComplaintDto backend. */
export function toCreateComplaintPayload({ opdId, kategori, title, description }) {
  return { opdId: Number(opdId), kategori, judul: title, uraian: description };
}

/**
 * Terjemahkan ComplaintReplyEntity (GET /complaints/:id/replies) -> bentuk
 * pesan chat (lihat ChatMessageBubble.jsx: role/senderName/text/timestamp).
 *
 * CATATAN GAP: backend hanya punya `authorId` (angka), TIDAK ada nama/role
 * pengirim tersimpan langsung -- role DIDERIVASI (bukan dikarang) dengan
 * membandingkan `authorId` terhadap `complaintUserId` (pelapor): satu-satunya
 * 2 pihak yang boleh membalas adalah pelapor & Admin OPD pemilik (lihat
 * ComplaintsService.assertAccess di backend), jadi perbandingan ini valid.
 * `senderName` utk pihak OPD tetap generik "Admin OPD" (nama asli butuh join
 * User yang belum diekspos ComplaintReplyEntity).
 */
export function adaptComplaintReplyToChatMessage(reply, complaintUserId) {
  const isReporter = reply.authorId === complaintUserId;
  const time = reply.createdAt
    ? new Date(reply.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '';
  return {
    type: 'chat',
    role: isReporter ? 'user' : 'admin',
    senderName: isReporter ? undefined : 'Admin OPD',
    text: reply.pesan,
    timestamp: time ? `${time} WIB` : '',
    status: 'Terkirim',
  };
}

export function adaptComplaintRepliesToChatMessages(replies, complaintUserId) {
  return replies.map((r) => adaptComplaintReplyToChatMessage(r, complaintUserId));
}
