// SUPERUSER dipisah kembali dari ADMIN_KABUPATEN (2026-08-20, atas permintaan
// user; sebelumnya digabung pada 2026-08-05). Bedanya BUKAN sekadar nama:
// superuser mewarisi seluruh hak Admin Kabupaten DITAMBAH akses log aktivitas,
// dan hanya superuser yang boleh memilih peran saat login.
export const USER_ROLES = {
  SUPERUSER: 'SUPERUSER',
  ADMIN_KABUPATEN: 'ADMIN_KABUPATEN',
  ADMIN_OPD: 'ADMIN_OPD',
  RESPONDENT: 'RESPONDENT',
};

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
};
