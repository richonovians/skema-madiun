import api from '@/services/api';
import { adaptUser, adaptUserList, toCreateUserPayload, toUpdateUserPayload } from '../adapters/user.adapter';

/**
 * Membuat akun administrator baru.
 * @param {{fullName: string, email: string, role: string, opdId?: number}} payload
 *   role pakai nilai frontend (USER_ROLES.ADMIN_OPD dkk) -- diterjemahkan ke
 *   backend ('opd'/'kabupaten'/dst) oleh toCreateUserPayload.
 * @returns {Promise<Object>} User (bentuk frontend, lihat user.adapter.js)
 */
export async function createUser(payload) {
  const response = await api.post('/users', toCreateUserPayload(payload));
  return adaptUser(response.data);
}

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
 * Mengubah nama/OPD tautan/role akun (2026-08-05: role kini bisa diubah
 * kabupaten, PATCH /users/:id -- backend menolak 403 bila userId == diri
 * sendiri, cegah self-lockout).
 * @param {number|string} userId
 * @param {{fullName?: string, opdId?: number, role?: string}} payload
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
