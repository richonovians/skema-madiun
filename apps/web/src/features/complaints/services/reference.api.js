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
