import { formatDateId, getInitials } from '@/utils/format';

/**
 * Terjemahkan UserEntity backend (GET /users) ke bentuk yang dipakai komponen
 * (lihat features/users/constants/userConstants.js). Satu tempat -- perubahan kontrak
 * backend cukup diubah di sini (INT-6).
 *
 * CATATAN GAP: status dummy punya 3 nilai (ACTIVE/INACTIVE/PENDING), backend cuma
 * py `isActive: boolean` (2 nilai) -- PENDING TIDAK PUNYA sinyal backend yang bisa
 * diandalkan (field `consentAt` yang mungkin relevan sengaja disembunyikan dari
 * API, lihat UserEntity). Adapter ini hanya map ACTIVE/INACTIVE; komponen yang
 * mengandalkan PENDING perlu disesuaikan, bukan ditebak di sini.
 */
// kabupaten = superuser (2026-08-05, role superuser terpisah digabung ke kabupaten).
const ROLE_MAP = {
  opd: 'ADMIN_OPD',
  kabupaten: 'ADMIN_KABUPATEN',
  responden: 'RESPONDENT',
};

export function adaptUser(user) {
  return {
    id: user.id,
    name: user.nama,
    email: user.email,
    initials: getInitials(user.nama),
    role: ROLE_MAP[user.role] ?? user.role,
    opdId: user.opdId ?? null,
    organization: user.opdNama ?? null,
    createdAt: formatDateId(user.createdAt),
    status: user.isActive ? 'ACTIVE' : 'INACTIVE',
  };
}

export function adaptUserList(users) {
  return users.map(adaptUser);
}

const ROLE_TO_BACKEND = {
  ADMIN_OPD: 'opd',
  ADMIN_KABUPATEN: 'kabupaten',
  RESPONDENT: 'responden',
};

/**
 * Terjemahkan payload form buat-akun (bentuk komponen, lihat
 * app/admin-kab/users/create/page.jsx) -> CreateUserDto backend.
 *
 * CATATAN GAP: form mengumpulkan `phone` & `isActive`, TAPI backend
 * (CreateUserDto) tidak punya field ini sama sekali -- sengaja TIDAK
 * dikirim di sini, bukan lupa. `isActive` khususnya: akun baru SELALU aktif
 * di backend (UsersService.create hardcode isActive:true); kalau perlu
 * nonaktif sejak awal, panggil updateUserStatus terpisah setelah create.
 * `phone` murni tak punya tempat di skema User sama sekali.
 */
export function toCreateUserPayload({ fullName, email, role, opdId }) {
  return {
    nama: fullName,
    email,
    role: ROLE_TO_BACKEND[role] ?? role,
    opdId: opdId ? Number(opdId) : undefined,
  };
}

/**
 * Terjemahkan payload edit akun -> UpdateUserDto backend (nama+opdId+role).
 * `role` opsional (2026-08-05, kabupaten bisa ubah role user lain) -- kirim
 * undefined bila tak disertakan pemanggil, class-validator `@IsOptional`
 * mengabaikannya.
 */
export function toUpdateUserPayload({ fullName, opdId, role }) {
  return {
    nama: fullName,
    opdId: opdId ? Number(opdId) : undefined,
    role: role ? (ROLE_TO_BACKEND[role] ?? role) : undefined,
  };
}
