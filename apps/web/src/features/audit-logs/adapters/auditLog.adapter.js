/**
 * Terjemahkan AuditLogEntity backend (GET /audit-logs, INT-34) ke bentuk yang
 * dipakai komponen (lihat features/audit-logs/constants/dummyAuditLogs.js utk
 * bentuk lama). Satu tempat -- perubahan kontrak backend cukup diubah di sini.
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
const ENTITAS_LABEL = {
  complaint: 'Pengaduan',
  opd: 'OPD',
  question: 'Pertanyaan',
  survey: 'Survei',
  user: 'Pengguna',
};

const AKSI_LABEL = {
  create: 'CREATE',
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
