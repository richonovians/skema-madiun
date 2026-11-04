import api from '@/services/api';

/**
 * Daftar kategori baku pengaduan dari backend (GET /ref/complaint-categories) --
 * SATU-SATUNYA sumber kategori resmi. Jangan hardcode ulang di komponen (lihat
 * INT-30 utk kasus serupa pada unsur SKM -- hardcode ganda pernah menyebabkan
 * data tertukar).
 *
 * Sejak 4 November 2026 setiap kategori membawa `tingkat`
 * ('kabupaten' | 'kecamatan'). TANPA kueri `tingkat` secara sengaja: formulir
 * pengaduan mengambil daftar lengkapnya sekali lalu menyaring sendiri saat tab
 * tingkat berpindah. Memanggil ulang per perpindahan tab akan menampilkan
 * "Memuat kategori..." pada data yang sudah ada di memori, dan membuat tab
 * terasa seperti memuat halaman.
 *
 * @param {{tingkat?: 'kabupaten'|'kecamatan'}} [params] penyaring sisi server, dipakai pemanggil lain
 * @returns {Promise<Array<{kode: string, nama: string, tingkat: string}>>}
 */
export async function getComplaintCategories(params = {}) {
  const response = await api.get('/ref/complaint-categories', { params });
  return response.data;
}
