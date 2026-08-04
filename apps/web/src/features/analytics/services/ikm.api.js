import api from '@/services/api';
import { adaptIkmMetrics, adaptIkmServiceElements } from '../adapters/ikm.adapter';

/** Hasil IKM sebuah survei (Admin OPD pemilik & Kabupaten). */
export async function getSurveyResults(surveyId) {
  const response = await api.get(`/surveys/${surveyId}/results`);
  const result = response.data;
  return {
    metrics: adaptIkmMetrics(result),
    serviceElements: adaptIkmServiceElements(result.nrrPerUnsur),
    periode: result.periode,
    jumlahResponden: result.jumlahResponden,
  };
}

/**
 * Unduh laporan hasil IKM. Endpoint ini mengembalikan file biner mentah (BUKAN
 * envelope JSON, lihat IkmController.exportResults di backend) -- responseType
 * 'blob' wajib, dan interceptor api.js otomatis membiarkannya lewat apa adanya
 * (unwrap envelope hanya jalan kalau body py field 'success').
 * @param {number|string} surveyId
 * @param {'csv'|'excel'|'pdf'} format
 * @returns {Promise<{blob: Blob, filename: string}>} caller yang memicu unduhan (bukan tugas service memanipulasi DOM)
 */
export async function exportSurveyResults(surveyId, format) {
  const response = await api.get(`/surveys/${surveyId}/results/export`, {
    params: { format },
    responseType: 'blob',
  });
  const disposition = response.headers?.['content-disposition'] ?? '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  const filename = match ? match[1] : `hasil-ikm-${surveyId}.${format}`;
  return { blob: response.data, filename };
}
