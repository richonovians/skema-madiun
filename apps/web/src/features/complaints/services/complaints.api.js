import api from '@/services/api';
import {
  adaptComplaint,
  adaptComplaintList,
  toBackendComplaintStatus,
  toCreateComplaintPayload,
} from '../adapters/complaint.adapter';

/**
 * Ajukan pengaduan baru (Responden). Multipart -- lampiran field `lampiran`,
 * maks 5 berkas (JPEG/PNG/WEBP/PDF, maks 5MB masing-masing, ditegakkan backend).
 * @param {{opdId: number|string, kategori: string, title: string, description: string, isAnonim?: boolean}} payload bentuk form (lihat CreateComplaintForm.jsx)
 * @param {File[]} [files]
 */
export async function createComplaint(payload, files = []) {
  const dto = toCreateComplaintPayload(payload);
  const formData = new FormData();
  // Hanya bila tujuannya diketahui. `String(undefined)` menghasilkan "undefined"
  // dan `String(NaN)` menghasilkan "NaN" -- keduanya lolos sebagai medan yang
  // ADA lalu ditolak backend 400, kegagalan yang sama sekali tak menjelaskan
  // sebabnya kepada pelapor.
  if (dto.opdId != null) {
    formData.append('opdId', String(dto.opdId));
  }
  formData.append('kategori', dto.kategori);
  // Hanya dikirim bila benar-benar anonim -- backend sudah berbaku `false`.
  if (dto.isAnonim) {
    formData.append('isAnonim', 'true');
  }
  formData.append('judul', dto.judul);
  formData.append('uraian', dto.uraian);
  files.forEach((file) => formData.append('lampiran', file));

  // Content-Type di-unset supaya tak bergantung pada default 'application/json'
  // milik instance api.js -- browser generate Content-Type+boundary sendiri
  // dari FormData (diverifikasi via Playwright, lihat commit INT-7).
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

/** Riwayat balasan mentah (bentuk backend, lihat adapter utk terjemahan ke chat message). */
export async function getComplaintReplies(complaintId) {
  const response = await api.get(`/complaints/${complaintId}/replies`);
  return response.data;
}

/**
 * Kirim balasan chat. Lampiran opsional (2026-08-06, laporan bug user "tidak
 * bisa mengirim dokumen/foto di chat") -- multipart field `lampiran`, sama
 * pola dgn createComplaint (maks 5 berkas, JPEG/PNG/WEBP/PDF, maks 5MB,
 * ditegakkan backend). Tanpa lampiran tetap multipart (bukan JSON) supaya
 * satu jalur kode saja, backend menerima keduanya lewat FilesInterceptor.
 * @param {number|string} complaintId
 * @param {string} pesan
 * @param {File[]} [files]
 */
export async function addComplaintReply(complaintId, pesan, files = []) {
  const formData = new FormData();
  formData.append('pesan', pesan);
  files.forEach((file) => formData.append('lampiran', file));

  const response = await api.post(`/complaints/${complaintId}/replies`, formData, {
    headers: { 'Content-Type': undefined },
  });
  return response.data;
}

/**
 * Teruskan pengaduan yang belum bertujuan ke OPD berwenang
 * (`PATCH /complaints/:id/opd`, 6 September 2026).
 *
 * Haknya (Superuser & Admin Kabupaten) ditegakkan backend di dalam
 * ComplaintsService.forward, bukan di sini.
 */
export async function forwardComplaint(id, opdId) {
  const response = await api.patch(`/complaints/${id}/opd`, { opdId: Number(opdId) });
  return adaptComplaint(response.data);
}
