import api from '@/services/api';
import { saveActingRoleCookie, saveConsentFlag } from './authStorage';

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
 * PENANDA PERSETUJUAN ikut diselaraskan (14 September 2026, laporan pengguna:
 * akun warga ber-peran banyak yang belum menyetujui PDP tetap dipantulkan dari
 * /persetujuan). Saat login, akun ber-peran banyak belum punya `actingRole`
 * sehingga backend melaporkan `consentRequired: false` -- yang berarti "belum
 * dapat ditentukan", BUKAN "sudah menyetujui" -- dan `saveSession` menulis
 * `consent=1` dari nilai itu. Di sinilah perannya akhirnya diketahui, jadi di
 * sini pula penanda tadi harus dikoreksi.
 *
 * `undefined` DIBIARKAN apa adanya: itu berarti responsnya tak menyebut
 * persetujuan sama sekali, dan tak ada kabar bukan alasan mencabut penanda
 * milik warga yang sudah menyetujui.
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
  if (typeof data?.consentRequired === 'boolean') {
    saveConsentFlag(!data.consentRequired);
  }
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
