import { getInitials } from '@/utils/format';

/**
 * Terjemahkan UserEntity backend (GET /users) ke bentuk yang dipakai komponen
 * (lihat features/users/constants/dummyUsers.js). Satu tempat -- perubahan kontrak
 * backend cukup diubah di sini (INT-6).
 *
 * CATATAN GAP: status dummy punya 3 nilai (ACTIVE/INACTIVE/PENDING), backend cuma
 * py `isActive: boolean` (2 nilai) -- PENDING TIDAK PUNYA sinyal backend yang bisa
 * diandalkan (field `consentAt` yang mungkin relevan sengaja disembunyikan dari
 * API, lihat UserEntity). Adapter ini hanya map ACTIVE/INACTIVE; komponen yang
 * mengandalkan PENDING perlu disesuaikan, bukan ditebak di sini.
 */
const ROLE_MAP = {
  opd: 'ADMIN_OPD',
  kabupaten: 'ADMIN_KABUPATEN',
  superuser: 'SUPER_ADMIN',
  responden: 'RESPONDENT',
};

export function adaptUser(user) {
  return {
    id: user.id,
    name: user.nama,
    email: user.email,
    initials: getInitials(user.nama),
    role: ROLE_MAP[user.role] ?? user.role,
    organization: user.opdNama ?? null,
    createdAt: user.createdAt,
    status: user.isActive ? 'ACTIVE' : 'INACTIVE',
  };
}

export function adaptUserList(users) {
  return users.map(adaptUser);
}
