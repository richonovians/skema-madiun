import { formatDateId, getInitials } from '@/utils/format';

/**
 * Terjemahkan ComplaintEntity backend (GET /complaints) ke bentuk yang dipakai
 * komponen. Satu tempat -- perubahan kontrak backend cukup diubah di sini (INT-6).
 *
 * CATATAN GAP BESAR: UI dummy lama (tampilan admin-kab, INT-33) mengharapkan
 * banyak field yang SAMA SEKALI TIDAK ADA di backend -- ini BUKAN masalah
 * penamaan yang bisa diselesaikan adapter, tapi kapasitas backend yang belum
 * dibangun (progress, priority, kecamatan, chronology, sla{...}, stats{...},
 * timeline[] -> tidak ada konsep ini sama sekali di skema Complaint/
 * ComplaintReply). Adapter ini SENGAJA tidak mengarang nilai untuk field-field
 * itu -- komponen yang menampilkannya sudah dirombak/dihapus di INT-33, bukan
 * tugas adapter frontend mengarang data.
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
    // Sub-kategori opsional di bawah kategori (INT-42, D12) -- sama seperti
    // kategori, ini kode mentah; label ramah-baca dari GET /ref/complaint-sub-categories.
    subKategori: complaint.subKategori ?? null,
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
 * Lampiran disajikan lewat `/uploads/*` (2026-08-05, `main.ts` `useStaticAssets`
 * -- SEBELUMNYA gap: fileUrl backend sudah benar tapi tak ada route yg
 * menyajikannya, selalu 404). Publik/tanpa-auth SENGAJA (nama file UUID tak
 * tertebak) -- endpoint terautentikasi adalah pekerjaan terpisah yg lebih besar.
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
export function toCreateComplaintPayload({ opdId, kategori, subKategori, title, description }) {
  return {
    opdId: Number(opdId),
    kategori,
    subKategori: subKategori || undefined,
    judul: title,
    uraian: description,
  };
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
    // Lampiran balasan (2026-08-06, laporan bug user) -- URL dibangun sama
    // persis dgn attachments tingkat-pengaduan (adaptComplaintAttachment).
    attachments: (reply.attachments ?? []).map(adaptComplaintAttachment),
    timestamp: time ? `${time} WIB` : '',
    status: 'Terkirim',
  };
}

export function adaptComplaintRepliesToChatMessages(replies, complaintUserId) {
  return replies.map((r) => adaptComplaintReplyToChatMessage(r, complaintUserId));
}
