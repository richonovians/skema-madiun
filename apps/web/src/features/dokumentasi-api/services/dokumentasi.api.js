import api from '@/services/api';
import { adaptOpenApi } from '../adapters/openapi.adapter';

/**
 * Dokumen OpenAPI seluruh API, sudah diratakan menjadi grup per tag.
 *
 * `response.data` SUDAH payload asli: interceptor respons di `@/services/api`
 * membuka envelope `{ success, statusCode, message, data, meta }`, jadi di sini
 * TIDAK ada `response.data.data`.
 *
 * Adapter dipanggil di sini, bukan di komponen -- pola yang sama dengan
 * `surveys.api.js`, supaya komponen tak perlu tahu bentuk OpenAPI.
 *
 * Hanya peran `kabupaten` yang berhak; peran lain dijawab 403 oleh backend.
 */
export async function getDokumentasiOperasi() {
  const response = await api.get('/dokumentasi/openapi');
  return adaptOpenApi(response.data);
}

/**
 * Dokumen OpenAPI UTUH, tanpa dilewatkan adapter.
 *
 * Dipakai hanya untuk unduhan: yang diimpor ke Postman atau Insomnia harus
 * dokumen aslinya, bukan bentuk yang sudah diterjemahkan untuk komponen.
 */
export async function getDokumenMentah() {
  const response = await api.get('/dokumentasi/openapi');
  return response.data;
}
