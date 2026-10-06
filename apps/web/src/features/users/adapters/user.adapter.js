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
// `superuser` DILEBUR ke `kabupaten` (15 September 2026) -- lihat userConstants.js.
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
    // `roles` (5 September 2026) menggantikan `role` tunggal. Dipetakan
    // elemen-per-elemen dengan tabel yang SAMA -- tak ada aturan baru yang
    // perlu diingat di dua tempat.
    roles: (user.roles ?? []).map((r) => ROLE_MAP[r] ?? r),
    opdId: user.opdId ?? null,
    // DILEWATKAN, bukan dihitung di sini (6 Oktober 2026). Aturannya
    // bergantung pada `NODE_ENV` backend -- gerbang ASN hanya hidup di
    // produksi -- dan frontend tak tahu apa pun tentang itu. Dua salinan
    // aturan berarti kotak centang yang dapat ditekan tetapi ditolak 400.
    //
    // `null` berarti BACKEND TAK MEMBERITAHU, dan sengaja bukan `true` atau
    // `false`: keduanya pernyataan yang belum dibuat siapa pun. Komponennya
    // menonaktifkan pilihan hanya pada `false` tersurat -- penegakan
    // sebenarnya tetap di `UsersService`, halaman ini cuma pengarahan UX.
    bolehJadiAdminOpd: user.bolehJadiAdminOpd ?? null,
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

/*
 * TANPA `toCreateUserPayload`. Halamannya dibuang 30 September 2026, jadi tak
 * ada lagi form buat-akun yang payloadnya perlu diterjemahkan. `ROLE_TO_BACKEND`
 * di atas TETAP dipakai `toUpdateUserPayload` di bawah.
 */

/**
 * Terjemahkan payload edit akun -> UpdateUserDto backend — HANYA `roles`.
 *
 * KEPEMILIKAN DATA (8 September 2026): `nama` & `opdId` berasal dari Helpdesk,
 * dan `UpdateUserDto` kini MENOLAK keduanya. Karena `ValidationPipe` backend
 * memakai `forbidNonWhitelisted`, mengirimkannya bukan lagi "diabaikan
 * `@IsOptional`" seperti dulu, melainkan 400 untuk seluruh permintaan.
 *
 * Field-nya dibuang DI SINI, bukan hanya di halaman pemanggilnya. Sebelum ini
 * halaman "Ubah Role Admin" sengaja tak mengirim `nama` sementara adapter tetap
 * menerimanya — aturan yang hidup di pemanggil, bukan di batas. Halaman
 * berikutnya yang memakai adapter ini tak perlu lagi mengingat aturannya.
 *
 * `fullName` & `opdId` sengaja TIDAK diterima lagi sebagai parameter, supaya
 * pemanggil yang masih mengirimkannya terlihat saat ESLint/uji berjalan, bukan
 * diam-diam dibuang di sini.
 */
export function toUpdateUserPayload({ roles }) {
  return {
    roles: roles ? roles.map((r) => ROLE_TO_BACKEND[r] ?? r) : undefined,
  };
}
