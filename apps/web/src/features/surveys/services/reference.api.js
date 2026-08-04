import api from '@/services/api';

/**
 * Daftar 9 unsur baku SKM (PermenPANRB 14/2017) dari backend -- SATU-SATUNYA sumber
 * urutan/teks resmi. Jangan hardcode ulang di komponen (lihat INT-30: U8/U9 pernah
 * tertukar karena frontend menyalin daftar ini secara manual).
 * @returns {Promise<Array<{kode: string, teks: string}>>}
 */
export async function getUnsur() {
  const response = await api.get('/ref/unsur');
  return response.data;
}
