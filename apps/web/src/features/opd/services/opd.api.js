import api from '@/services/api';
import { adaptOpd, adaptOpdList } from '../adapters/opd.adapter';

/** @param {{search?: string, isActive?: boolean, page?: number, limit?: number}} params */
export async function getOpdList(params = {}) {
  const response = await api.get('/opd', { params });
  return { data: adaptOpdList(response.data), meta: response.meta };
}

/**
 * SELURUH OPD, ditelusuri per halaman (5 November 2026).
 *
 * MENGAPA BUKAN SATU PERMINTAAN BERLIMIT BESAR. `PaginationQueryDto` memasang
 * `@Max(100)` pada `limit`, jadi `?limit=500` dijawab 400 "limit must not be
 * greater than 100" -- dan pemanggil yang mengira ia sedang meminta "semua"
 * justru tak menerima apa pun. Itu terjadi sungguhan pada modal pengalihan:
 * dropdown instansinya kosong, dan dropdown kategorinya ikut kosong karena
 * tingkatnya tak dapat diketahui tanpa instansi terpilih.
 *
 * MENGAPA BUKAN SATU HALAMAN 100 SAJA. Daftar OPD disinkronkan dari Helpdesk
 * dan hari ini berisi 63 baris. Pada satu halaman, instansi ke-101 hilang dari
 * dropdown tanpa galat apa pun begitu Helpdesk melewatinya -- dan gejalanya
 * terbaca sebagai "OPD-nya tidak ada", bukan sebagai daftar yang terpotong.
 *
 * `maksHalaman` adalah sabuk pengaman terhadap `meta.pagination` yang cacat:
 * tanpa itu, `totalPages` yang keliru membuat gelungnya tak pernah berhenti.
 *
 * @param {{search?: string, isActive?: boolean}} [params]
 * @param {{maksHalaman?: number}} [opsi]
 */
export async function getSemuaOpd(params = {}, { maksHalaman = 20 } = {}) {
  const LIMIT = 100; // nilai terbesar yang diterima PaginationQueryDto
  const terkumpul = [];
  let halaman = 1;
  let totalHalaman = 1;

  do {
    const { data, meta } = await getOpdList({ ...params, page: halaman, limit: LIMIT });
    terkumpul.push(...data);
    // `?? 1`: respons tanpa `meta.pagination` berarti tak ada halaman lain
    // yang diketahui — berhenti, jangan menebak.
    totalHalaman = meta?.pagination?.totalPages ?? 1;
    halaman += 1;
  } while (halaman <= totalHalaman && halaman <= maksHalaman);

  return terkumpul;
}

export async function getOpdById(opdId) {
  const response = await api.get(`/opd/${opdId}`);
  return adaptOpd(response.data);
}

/**
 * Sinkronkan cache OPD dari Helpdesk (OPD adalah read-only cache -- TIDAK ada
 * create/update manual, lihat keputusan D10 di docs/Rencana-Integrasi-Frontend-Backend.md).
 * @returns {Promise<{fetched: number, created: number, updated: number, deactivated: number, skipped: number}>}
 */
export async function syncOpd() {
  const response = await api.post('/opd/sync');
  return response.data;
}
