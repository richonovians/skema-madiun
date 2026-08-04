import api from '@/services/api';

/**
 * Membuat akun administrator baru.
 *
 * Payload yang diharapkan backend (POST /users):
 * {
 *   fullName: string,
 *   email: string,
 *   phone: string,
 *   role: 'ADMIN_KABUPATEN' | 'ADMIN_OPD',
 *   opdId: number | null,   // wajib jika role === 'ADMIN_OPD'
 *   isActive: boolean,
 * }
 *
 * @param {Object} payload
 * @returns {Promise<Object>} Data user yang baru dibuat
 */
export async function createUser(payload) {
  const response = await api.post('/users', payload);
  return response.data;
}

/**
 * Mengambil daftar pengguna dengan filter opsional.
 *
 * @param {Object} params - Query params (role, status, page, limit, dll)
 * @returns {Promise<{ data: Array, meta: Object }>}
 */
export async function getUsers(params = {}) {
  const response = await api.get('/users', { params });
  return { data: response.data, meta: response.meta };
}

/**
 * Mengambil detail satu pengguna berdasarkan ID.
 *
 * @param {number|string} userId
 * @returns {Promise<Object>}
 */
export async function getUserById(userId) {
  const response = await api.get(`/users/${userId}`);
  return response.data;
}
