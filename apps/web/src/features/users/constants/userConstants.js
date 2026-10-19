// SUPERUSER DILEBUR ke ADMIN_KABUPATEN (15 September 2026, permintaan
// pengguna). Kuasanya -- manajemen pengguna & log aktivitas -- pindah ke Admin
// Kabupaten, dan perannya dihapus sampai ke nilai enum di basis data, jadi tak
// ada lagi jalan membuatnya. Sebelumnya keduanya sempat dipisah (2026-08-20)
// lalu digabung (2026-08-05) -- peleburan ini yang terakhir.
export const USER_ROLES = {
  ADMIN_KABUPATEN: 'ADMIN_KABUPATEN',
  ADMIN_OPD: 'ADMIN_OPD',
  RESPONDENT: 'RESPONDENT',
};

export const USER_STATUS = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  PENDING: 'PENDING',
};
