import api from '@/services/api';
import { adaptUser, adaptUserList, toUpdateUserPayload } from '../adapters/user.adapter';

/*
 * TANPA `createUser`. Halaman "Buat Akun Admin Baru" dibuang 30 September 2026
 * (permintaan pengguna), dan pembungkus ini satu-satunya pemanggilnya. Endpoint
 * `POST /users` di backend TETAP ADA dan tetap teruji di users.e2e-spec.ts --
 * yang dibuang jalan masuk dari antarmuka, bukan kontrak apinya.
 */

/**
 * Mengambil daftar pengguna dengan filter opsional.
 * @param {{role?: string, opdId?: number, page?: number, limit?: number}} params
 * @returns {Promise<{data: Array, meta: Object}>}
 */
export async function getUsers(params = {}) {
  const response = await api.get('/users', { params });
  return { data: adaptUserList(response.data), meta: response.meta };
}

/**
 * Mengambil detail satu pengguna berdasarkan ID.
 * @param {number|string} userId
 * @returns {Promise<Object>}
 */
export async function getUserById(userId) {
  const response = await api.get(`/users/${userId}`);
  return adaptUser(response.data);
}

/**
 * Mengubah ROLE akun (`PATCH /users/:id`).
 *
 * HANYA role, sejak 8 September 2026: `nama` & `opdId` berasal dari Helpdesk
 * dan backend menolak keduanya dengan 400 (UpdateUserDto). Sejak 2026-08-20
 * hanya superuser yang boleh memanggilnya, dan backend menolak 403 bila
 * userId == diri sendiri (cegah self-lockout).
 * @param {number|string} userId
 * @param {{roles?: string[]}} payload
 * @returns {Promise<Object>}
 */
export async function updateUser(userId, payload) {
  const response = await api.patch(`/users/${userId}`, toUpdateUserPayload(payload));
  return adaptUser(response.data);
}

/**
 * Aktifkan/nonaktifkan akun.
 * @param {number|string} userId
 * @param {boolean} isActive
 * @returns {Promise<Object>}
 */
export async function updateUserStatus(userId, isActive) {
  const response = await api.patch(`/users/${userId}/status`, { isActive });
  return adaptUser(response.data);
}

/**
 * Hapus akun (2026-08-05: soft delete di backend -- `deletedAt`+`isActive:
 * false`, bukan hapus baris). Backend menolak 403 bila userId == diri
 * sendiri (cegah self-lockout), sama pola dgn updateUser role.
 * @param {number|string} userId
 * @returns {Promise<Object>}
 */
export async function deleteUser(userId) {
  const response = await api.delete(`/users/${userId}`);
  return adaptUser(response.data);
}

/**
 * Jumlah akun aktif & total (`GET /users/stats`, 6 September 2026).
 *
 * Dipisah dari `getUsers` walau halaman ini memuat keduanya: daftar akun
 * dipaginasi, jadi jumlah barisnya BUKAN jumlah akun -- memakai `meta.total`
 * akan menghitung yang aktif dan yang nonaktif sekaligus.
 */
export async function getUserStats() {
  const response = await api.get('/users/stats');
  return response.data;
}
