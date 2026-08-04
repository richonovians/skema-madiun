import api from '@/services/api';

export const authApi = {
  devLogin: (identifier) => api.post('/auth/dev-login', { identifier }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
};
