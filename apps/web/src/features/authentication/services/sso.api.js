import api from '@/services/api';

/**
 * Alamat mulai-login SSO Helpdesk (2026-08-27).
 *
 * Dibuat sebagai URL, bukan pemanggilan axios, dan itu bukan kelalaian: alur
 * OAuth2 menuntut peramban BERPINDAH ke Helpdesk lewat navigasi tingkat atas.
 * Memanggilnya lewat XHR hanya akan mengambil badan respons 302 tanpa pengguna
 * pernah melihat halaman login Helpdesk -- dan cookie `state` yang disetel
 * respons itu pun tak ada gunanya. Tetap diletakkan di lapisan services supaya
 * komponen tak menyusun alamat backend sendiri.
 */
export function getSsoLoginUrl() {
  const base = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';
  return `${base.replace(/\/+$/, '')}/auth/sso/login`;
}

export const authApi = {
  devLogin: (identifier) => api.post('/auth/dev-login', { identifier }),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
  /**
   * Catat persetujuan pemrosesan data pribadi (UU PDP). Idempoten di backend —
   * memanggilnya ulang mengembalikan waktu persetujuan yang sudah ada tanpa
   * menggesernya, jadi klik ganda tak merusak apa pun.
   */
  recordConsent: () => api.post('/auth/consent'),
  /** @param {{nama?: string, jenisKelamin?: string, kelompokUmur?: string, pendidikan?: string, pekerjaan?: string}} payload */
  updateProfile: (payload) => api.patch('/auth/profile', payload),
};
