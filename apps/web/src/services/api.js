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

// Interceptor Response: buka envelope backend { success, statusCode, message, data, meta }
// agar pemanggil cukup pakai response.data sebagai payload asli, bukan response.data.data.
// meta (termasuk meta.pagination untuk endpoint terpaginasi) dipindah ke response.meta
// supaya tidak hilang. Endpoint non-JSON (mis. unduhan file) tidak match 'success' -> dibiarkan apa adanya.
api.interceptors.response.use(
  (response) => {
    const envelope = response.data;
    if (envelope && typeof envelope === 'object' && 'success' in envelope) {
      response.meta = envelope.meta;
      response.data = envelope.data;
    }
    return response;
  },
  (error) => {
    if (error.response) {
      const envelope = error.response.data;
      // Sematkan pesan error dari backend ke error.message agar catch(err) langsung
      // dapat pesan yang relevan (default axios cuma "Request failed with status code 4xx").
      if (envelope && typeof envelope === 'object' && 'message' in envelope) {
        error.message = envelope.message;
      }
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
