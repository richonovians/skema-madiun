import api from '@/services/api';

export const authApi = {
  devLogin: (identifier) => api.post('/auth/dev-login', { identifier }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  /** @param {{nama?: string, jenisKelamin?: string, kelompokUmur?: string, pendidikan?: string, pekerjaan?: string}} payload */
  updateProfile: (payload) => api.patch('/auth/profile', payload),
};
