import axios from 'axios';
// Sengaja memakai ulang clearSession() alih-alih menghapus key di sini: daftar
// artefak sesi (token & role, masing-masing di localStorage DAN cookie) hanya
// boleh punya satu definisi. Menyalinnya ke sini persis yang dulu bikin
// pembersihan tak sinkron. authStorage tak mengimpor apa pun, jadi tak ada
// impor sirkular.
import { clearSession } from '@/features/authentication/services/authStorage';

// Konfigurasi instance Axios
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
  // WAJIB untuk sesi SSO (2026-08-27): tokennya kini dititipkan backend sebagai
  // cookie `session` HttpOnly, dan axios TIDAK mengirim cookie pada permintaan
  // lintas-origin kecuali diminta -- frontend :3000 memanggil API :3001, jadi
  // tanpa ini setiap panggilan setelah login SSO akan 401 padahal cookie-nya ada.
  //
  // Sisi backend sudah menyiapkannya sejak awal: `credentials: true` di
  // app.setup.ts dengan origin EKSPLISIT (bukan '*', yang justru dilarang
  // dipasangkan dengan credentials oleh peramban).
  withCredentials: true,
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
          // SEBELUMNYA hanya `localStorage.removeItem('token')` -- `role` di
          // localStorage dan KEDUA cookie (`token`, `role`) dibiarkan utuh,
          // sehingga proxy.js (yang membaca cookie) masih menganggap sesi hidup
          // dan tetap membuka /admin-* padahal seluruh API-nya 401. Kini seluruh
          // artefak sesi dibersihkan sekaligus.
          //
          // Aman untuk SEMUA 401: backend memakai 401 khusus "Autentikasi
          // diperlukan" (sesi tak sah), sedangkan penolakan karena peran/akses
          // dikembalikan sebagai 403 -- lihat RolesGuard & opd-scope.util.ts.
          clearSession();
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
