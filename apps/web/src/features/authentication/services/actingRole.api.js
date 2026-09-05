import api from '@/services/api';
import { saveActingRoleCookie } from './authStorage';

/**
 * Ganti peran yang sedang dipakai pada sesi ini (5 September 2026).
 *
 * Backend menerbitkan sesi BARU, dan cara penyerahannya MENGIKUTI kanal sesi
 * lama:
 * - jalur dev-login (Bearer di localStorage) -> tokennya ada di body, harus
 *   disimpan di sini;
 * - jalur SSO -> token dititipkan sebagai cookie `session` HttpOnly dan body
 *   TIDAK memuatnya sama sekali. Itu bukan kekurangan: mengembalikannya ke
 *   JavaScript akan meniadakan guna HttpOnly-nya.
 *
 * Cookie `role` diperbarui di kedua jalur, karena proxy.js membacanya untuk
 * menentukan halaman mana yang dibukakan.
 *
 * @param {string} role peran BACKEND ('superuser'|'kabupaten'|'opd'|'responden')
 */
export async function setActingRole(role) {
  const response = await api.post('/auth/acting-role', { role });
  const data = response.data;
  if (data?.token) {
    localStorage.setItem('token', data.token);
  }
  saveActingRoleCookie(data?.role ?? role);
  return data;
}

/**
 * Role yang dimiliki akun, untuk menyusun pemilih peran.
 *
 * BUKAN `getMyProfile()`, dan alasannya menentukan: `GET /auth/me` menolak 401
 * justru ketika peran belum dipilih, sehingga memakainya di halaman pemilih
 * peran menghasilkan ayam-dan-telur -- pemiliknya tak akan pernah bisa memuat
 * daftar pilihannya. Backend menyediakan `GET /auth/roles` khusus untuk ini.
 */
export async function getMyRoles() {
  const response = await api.get('/auth/roles');
  return response.data;
}
