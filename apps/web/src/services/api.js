import axios from 'axios';

// Konfigurasi instance Axios
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Interceptor Request: Menyematkan token JWT jika ada
api.interceptors.request.use(
  (config) => {
    // Pada Next.js sisi client, kita bisa mengambil token dari localStorage/cookie.
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor Response: Handle global error (misal: 401 Unauthorized)
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      if (error.response.status === 401) {
        if (typeof window !== 'undefined') {
          // Hapus token jika unauthorized
          localStorage.removeItem('token');
          // Opsional: redirect ke login
          // window.location.href = '/login'; 
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
