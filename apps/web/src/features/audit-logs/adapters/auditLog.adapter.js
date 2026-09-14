/**
 * Terjemahkan AuditLogEntity backend (GET /audit-logs, INT-34) ke bentuk yang
 * dipakai komponen. Satu tempat -- perubahan kontrak backend cukup diubah di sini.
 *
 * CATATAN GAP BESAR (bukan penamaan, kapasitas backend yang memang tak ada):
 *   - role/opd per-entri, ipAddress/browser/operatingSystem/device/sessionId,
 *     status SUCCESS/FAILED, oldValue/newValue terstruktur -- SEMUA tidak ada
 *     di skema `AuditLog` (cuma actorId/aksi/entitas/detail/timestamp).
 *     AuditInterceptor HANYA mencatat SETELAH handler sukses (tak pernah ada
 *     baris utk aksi gagal), jadi "status" tak pernah bermakna variatif.
 *   - `detail` cuma `{ params, body }` mentah (params+body request asli),
 *     BUKAN diff before/after terstruktur -- ditampilkan apa adanya sbg
 *     payload permintaan, bukan dikarang jadi oldValue/newValue.
 * Adapter ini SENGAJA tidak mengarang nilai untuk field-field itu.
 */
/**
 * `auth`, `response`, dan `complaint_reply` ditambahkan 13 September 2026.
 *
 * `auth` bukan entitas baru: 315 baris login/logout/consent warga SUDAH ada di
 * basis data sejak lama, tapi tak pernah punya label sehingga tampil sebagai
 * teks mentah "auth" -- dan tak dapat disaring, karena dropdown Modul pun tak
 * memuatnya. Dua yang lain menyusul dekorator `@Audit` yang baru dipasang pada
 * endpoint yang dipakai warga.
 */
const ENTITAS_LABEL = {
  auth: 'Autentikasi',
  complaint: 'Pengaduan',
  complaint_reply: 'Balasan Pengaduan',
  opd: 'OPD',
  question: 'Pertanyaan',
  response: 'Jawaban Survei',
  survey: 'Survei',
  user: 'Pengguna',
};

const AKSI_LABEL = {
  create: 'CREATE',
  login: 'LOGIN',
  logout: 'LOGOUT',
  consent: 'PERSETUJUAN PDP',
  update_profile: 'UBAH PROFIL',
  update: 'UPDATE',
  delete: 'DELETE',
  update_status: 'UPDATE STATUS',
  sync: 'SYNC',
  apply_template: 'APPLY TEMPLATE',
  reorder: 'REORDER',
  duplicate: 'DUPLICATE',
};

export function entitasLabel(entitas) {
  return ENTITAS_LABEL[entitas] ?? entitas;
}

export function aksiLabel(aksi) {
  return AKSI_LABEL[aksi] ?? aksi.toUpperCase();
}

export function adaptAuditLog(log) {
  const detail = log.detail ?? {};
  return {
    id: log.id,
    createdAt: log.timestamp,
    actorId: log.actorId,
    user: log.actorNama,
    entitas: log.entitas,
    module: entitasLabel(log.entitas),
    aksi: log.aksi,
    action: aksiLabel(log.aksi),
    // Ringkasan DIDERIVASI dari aksi+entitas (bukan field asli backend --
    // AuditLogEntity tak punya kalimat deskripsi siap pakai).
    summary: `${aksiLabel(log.aksi)} ${entitasLabel(log.entitas)}`,
    params: detail.params ?? null,
    body: detail.body ?? null,
  };
}

export function adaptAuditLogList(logs) {
  return logs.map(adaptAuditLog);
}
