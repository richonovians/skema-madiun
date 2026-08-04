import { authApi } from '@/features/authentication/services/sso.api';
import { adaptMe } from '../adapters/me.adapter';

export async function getMyProfile() {
  const response = await authApi.me();
  return adaptMe(response.data);
}

/**
 * Ubah nama & data demografis (Responden). CATATAN: hanya field yang memang
 * ada di UpdateProfileDto backend -- nama, jenisKelamin, kelompokUmur,
 * pendidikan, pekerjaan. Tidak ada field lain (phone/nik/address) krn memang
 * tak didukung backend (lihat catatan gap di me.adapter.js).
 * @param {{nama?: string, jenisKelamin?: 'laki_laki'|'perempuan', kelompokUmur?: string, pendidikan?: string, pekerjaan?: string}} payload
 */
export async function updateMyProfile(payload) {
  const response = await authApi.updateProfile(payload);
  return adaptMe(response.data);
}
