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

  // Pengaduan anonim: backend MENGHILANGKAN `reporterNama` & `userId` (bukan
  // mengirimnya null). Tanpa penanganan di sini komponen hanya menampilkan '-',
  // yang membuat admin menyangka datanya rusak alih-alih disembunyikan.
  const isAnonim = complaint.isAnonim === true;
  const reporterName = isAnonim ? 'Anonim' : (complaint.reporterNama ?? null);

  return {
    id: complaint.ticketNo,
    numericId: complaint.id,
    userId: complaint.userId,
    opdId: complaint.opdId,
    isAnonim,
    reporter: {
      name: reporterName,
      initials: reporterName ? getInitials(reporterName) : '',
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
    // Kode kategori mentah ('aduan'/'lapor'/'lainnya') -- label ramah-baca
    // perlu di-cross-reference terpisah ke GET /ref/complaint-categories, di
    // luar tanggung jawab adapter sinkron ini.
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
export function toCreateComplaintPayload({ opdId, kategori, title, description, isAnonim }) {
  return {
    // `undefined` bila tujuannya belum diketahui (6 September 2026). Number('')
    // menghasilkan 0 dan Number(undefined) menghasilkan NaN -- keduanya akan
    // terkirim sebagai medan yang ada dan ditolak backend.
    opdId: opdId == null || opdId === '' ? undefined : Number(opdId),
    kategori,
    judul: title,
    uraian: description,
    isAnonim: isAnonim === true,
  };
}

/**
 * Terjemahkan ComplaintReplyEntity (GET /complaints/:id/replies) -> bentuk
 * pesan chat (lihat ChatMessageBubble.jsx: role/senderName/text/timestamp).
 *
 * CATATAN GAP: backend hanya punya `authorId` (angka) -- `ComplaintReplyEntity`
 * TIDAK mengekspos nama maupun peran pengirim. Yang bisa diketahui frontend
 * hanyalah "pelapor atau bukan", dengan membandingkan `authorId` terhadap
 * `complaintUserId`.
 *
 * KOREKSI (2026-08-19, laporan bug user "kirim pesan dari role admin kabupaten
 * masih menampilkan admin OPD"): catatan lama di sini menyatakan hanya 2 pihak
 * yang boleh membalas (pelapor & Admin OPD pemilik) -- itu KELIRU.
 * `ComplaintsService.assertAccess` meloloskan `Role.kabupaten` lebih dulu
 * (superuser), jadi ada TIGA kemungkinan pengirim. Akibatnya label lama
 * "Admin OPD" bukan sekadar generik, tapi salah: pada data pengembangan, 4 dari
 * 10 balasan ditulis akun kabupaten dan semuanya dilabeli Admin OPD.
 *
 * `senderName` kini "Admin" untuk SEMUA pengirim non-pelapor -- benar untuk
 * ketiga peran admin sekaligus. Membedakan "Admin Kabupaten" vs "Admin OPD"
 * MUSTAHIL di frontend tanpa backend mengekspos peran penulis; menebaknya dari
 * OPD pengaduan akan salah setiap kali kabupaten yang membalas.
 *
 * PENGADUAN ANONIM (4 September 2026): `authorId` balasan pelapor DIHILANGKAN
 * backend, dan `complaint.userId` pun tak dikirim. Pembandingan lama
 * (`authorId === complaintUserId`) kebetulan masih "benar" karena
 * undefined === undefined -- dan kebetulan seperti itu tak boleh dijadikan
 * dasar. Yang diperiksa di sini ADA-TIDAKNYA `authorId`, tepat seperti yang
 * dijanjikan kontrak backend.
 */
export function adaptComplaintReplyToChatMessage(reply, complaintUserId, { isAnonim = false } = {}) {
  const isReporter = isAnonim ? reply.authorId == null : reply.authorId === complaintUserId;
  const time = reply.createdAt
    ? new Date(reply.createdAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
    : '';
  return {
    type: 'chat',
    role: isReporter ? 'user' : 'admin',
    // Pelapor anonim DIBERI label: tanpanya, percakapan di mata admin tampak
    // seolah ditulis pihak yang tak dikenal. Pelapor biasa tetap tanpa label
    // (gelembungnya memang tak pernah menampilkan nama).
    senderName: isReporter ? (isAnonim ? 'Pelapor (anonim)' : undefined) : 'Admin',
    text: reply.pesan,
    // Lampiran balasan (2026-08-06, laporan bug user) -- URL dibangun sama
    // persis dgn attachments tingkat-pengaduan (adaptComplaintAttachment).
    attachments: (reply.attachments ?? []).map(adaptComplaintAttachment),
    timestamp: time ? `${time} WIB` : '',
    status: 'Terkirim',
  };
}

export function adaptComplaintRepliesToChatMessages(replies, complaintUserId, opsi) {
  return replies.map((r) => adaptComplaintReplyToChatMessage(r, complaintUserId, opsi));
}
