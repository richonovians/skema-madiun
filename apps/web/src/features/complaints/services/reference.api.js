import api from '@/services/api';

/**
 * Daftar kategori baku pengaduan dari backend (GET /ref/complaint-categories) --
 * SATU-SATUNYA sumber kategori resmi. Jangan hardcode ulang di komponen (lihat
 * INT-30 utk kasus serupa pada unsur SKM -- hardcode ganda pernah menyebabkan
 * data tertukar).
 * @returns {Promise<Array<{kode: string, nama: string}>>}
 */
export async function getComplaintCategories() {
  const response = await api.get('/ref/complaint-categories');
  return response.data;
}

/**
 * Daftar sub-kategori pengaduan (INT-42, D12) -- level lebih spesifik di bawah
 * kategori umum. Opsional filter per kategori induk.
 * @param {string} [kategoriKode]
 * @returns {Promise<Array<{kode: string, nama: string, kategoriKode: string}>>}
 */
export async function getComplaintSubCategories(kategoriKode) {
  const response = await api.get('/ref/complaint-sub-categories', {
    params: kategoriKode ? { kategori: kategoriKode } : undefined,
  });
  return response.data;
}
