import api from '@/services/api';
import {
  adaptComplaint,
  adaptComplaintList,
  adaptComplaintReplyList,
  toBackendComplaintStatus,
} from '../adapters/complaint.adapter';

/**
 * Ajukan pengaduan baru (Responden). Multipart -- lampiran field `lampiran`,
 * maks 5 berkas (JPEG/PNG/WEBP/PDF, maks 5MB masing-masing, ditegakkan backend).
 * @param {{opdId: number, kategori: string, judul: string, uraian: string}} payload
 * @param {File[]} [files]
 */
export async function createComplaint(payload, files = []) {
  const formData = new FormData();
  formData.append('opdId', String(payload.opdId));
  formData.append('kategori', payload.kategori);
  formData.append('judul', payload.judul);
  formData.append('uraian', payload.uraian);
  files.forEach((file) => formData.append('lampiran', file));

  // Content-Type di-unset (bukan diisi 'multipart/form-data' string manual) supaya
  // TIDAK bergantung pada default 'application/json' milik instance api.js --
  // `undefined` di sini membuat axios menghapus header itu dari request,
  // membiarkan browser generate Content-Type+boundary sendiri dari FormData
  // (diverifikasi via Playwright: axios@1.18.1 di browser sebenarnya tetap
  // menyisipkan boundary yang benar walau Content-Type diisi string manual
  // tanpa boundary -- tapi pola `undefined` ini tetap dipilih krn eksplisit
  // & tak bergantung pada deteksi otomatis axios yang bisa beda antar versi).
  const response = await api.post('/complaints', formData, {
    headers: { 'Content-Type': undefined },
  });
  return adaptComplaint(response.data);
}

/** @param {{status?: string, page?: number, limit?: number}} params status pakai enum backend ('diterima' dkk) jika difilter. */
export async function getComplaints(params = {}) {
  const response = await api.get('/complaints', { params });
  return { data: adaptComplaintList(response.data), meta: response.meta };
}

export async function getComplaintByTicketNo(ticketNo) {
  const response = await api.get(`/complaints/${ticketNo}`);
  return adaptComplaint(response.data);
}

/**
 * Ubah status pengaduan (Admin OPD pemilik).
 * @param {string} status Nilai frontend ('Diproses' dkk).
 * @param {string} [catatan] Wajib bila status='Ditolak'.
 */
export async function updateComplaintStatus(complaintId, status, catatan) {
  const response = await api.patch(`/complaints/${complaintId}/status`, {
    status: toBackendComplaintStatus(status),
    catatan,
  });
  return adaptComplaint(response.data);
}

export async function getComplaintReplies(complaintId) {
  const response = await api.get(`/complaints/${complaintId}/replies`);
  return adaptComplaintReplyList(response.data);
}

export async function addComplaintReply(complaintId, pesan) {
  const response = await api.post(`/complaints/${complaintId}/replies`, { pesan });
  return response.data;
}
