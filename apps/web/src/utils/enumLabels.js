/**
 * Label tampilan Indonesia + varian Badge untuk enum yang sudah diterjemahkan
 * adapter (lihat features/*\/adapters/*.adapter.js). Satu tempat -- sebelum ini
 * label serupa sempat digandakan sendiri-sendiri di komponen (mis. getActionBadge
 * di AuditTable.jsx, MUTU_LABEL di ikm.adapter.js).
 *
 * Varian Badge yang valid (lihat components/ui/Badge.jsx):
 * default | primary | secondary | success | info | warning | danger
 */

export const SURVEY_STATUS_LABEL = {
  DRAF: 'Draf',
  AKTIF: 'Aktif',
  DITUTUP: 'Ditutup',
};

export const SURVEY_STATUS_BADGE_VARIANT = {
  DRAF: 'default',
  AKTIF: 'success',
  DITUTUP: 'secondary',
};

export const COMPLAINT_STATUS_LABEL = {
  Diterima: 'Diterima',
  Diproses: 'Diproses',
  Selesai: 'Selesai',
  Ditolak: 'Ditolak',
};

export const COMPLAINT_STATUS_BADGE_VARIANT = {
  Diterima: 'info',
  Diproses: 'warning',
  Selesai: 'success',
  Ditolak: 'danger',
};

export const ROLE_LABEL = {
  SUPERUSER: 'Superuser',
  ADMIN_OPD: 'Admin OPD',
  ADMIN_KABUPATEN: 'Admin Kabupaten',
  RESPONDENT: 'Responden',
};

/** Tabel resmi PermenPANRB 14/2017 (docs/PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md baris 388-395). */
export const IKM_MUTU_LABEL = {
  A: 'Sangat Baik',
  B: 'Baik',
  C: 'Kurang Baik',
  D: 'Tidak Baik',
};
