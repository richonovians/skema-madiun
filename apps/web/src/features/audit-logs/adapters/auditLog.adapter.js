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

/**
 * Label aksi, SELURUHNYA bahasa Indonesia (6 Oktober 2026, permintaan pengguna).
 *
 * Sebelum ini petanya campur bahasa: `CREATE`, `LOGIN`, dan `UPDATE STATUS`
 * bersebelahan dengan `PERSETUJUAN PDP` dan `UBAH PROFIL`, padahal teks
 * antarmuka di repo ini berbahasa Indonesia. Kecampurannya itu sendiri yang
 * menjadi cacatnya -- bukan hanya lima aksi yang belum berlabel.
 *
 * LENGKAP TERHADAP KODE BACKEND, bukan terhadap basis data. Aksi datang dari
 * tiga sumber, dan hanya dua yang pertama pernah muncul di `audit_logs` hari
 * ini: `AuditInterceptor` menurunkan create/update/delete dari metode HTTP,
 * `@Audit('entitas', 'aksi')` pada controller, dan `AuditService.record`
 * langsung di service. Menyusun daftar ini dari `select distinct aksi` akan
 * melewatkan setiap aksi yang belum pernah terjadi -- dan `purge` maupun
 * `sso_cabut_peran_opd` justru jenis aksi yang jarang.
 *
 * KUNCINYA TIDAK DITERJEMAHKAN, hanya labelnya. Nilai `audit_logs.aksi` adalah
 * data yang sudah tersimpan dan dipakai penyaring; mengubahnya berarti migrasi
 * atas tabel yang tak boleh disentuh.
 */
const AKSI_LABEL = {
  create: 'BUAT',
  update: 'UBAH',
  delete: 'HAPUS',
  update_status: 'UBAH STATUS',
  update_profile: 'UBAH PROFIL',
  login: 'MASUK',
  logout: 'KELUAR',
  consent: 'PERSETUJUAN PDP',
  sync: 'SINKRONISASI',
  apply_template: 'TERAPKAN TEMPLATE',
  reorder: 'UBAH URUTAN',
  duplicate: 'DUPLIKAT',
  forward: 'TERUSKAN KE OPD',
  restore: 'PULIHKAN',
  purge: 'MUSNAHKAN',
  // Dua aksi SSO. Keduanya perubahan hak akses yang terjadi tanpa ada manusia
  // menekan apa pun, jadi awalan "SSO" disebut tersurat: yang membacanya perlu
  // tahu bahwa bukan seorang Admin Kabupaten yang melakukannya.
  sso_grant_kabupaten: 'SSO BERI PERAN KABUPATEN',
  sso_cabut_peran_opd: 'SSO CABUT PERAN ADMIN OPD',
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
