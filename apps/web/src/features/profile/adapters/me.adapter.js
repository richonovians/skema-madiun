import { formatDateId, getInitials } from '@/utils/format';
import { ROLE_LABEL } from '@/utils/enumLabels';

// `superuser` dipisah kembali dari `kabupaten` (2026-08-20) -- lihat userConstants.js.
// Peran INILAH yang menentukan tampil-tidaknya log aktivitas, karena datangnya
// dari backend (GET /auth/me), bukan dari cookie yang bisa disunting di browser.
const ROLE_TO_FRONTEND = {
  opd: 'ADMIN_OPD',
  kabupaten: 'ADMIN_KABUPATEN',
  responden: 'RESPONDENT',
  superuser: 'SUPERUSER',
};

/**
 * Terjemahkan MeEntity backend (GET /auth/me) ke bentuk yang dipakai komponen
 * profil. Satu tempat
 * -- perubahan kontrak backend cukup diubah di sini (INT-16).
 *
 * CATATAN GAP BESAR: dummy mengharapkan banyak field identitas yang TIDAK ADA
 * di skema User/RespondentProfile sama sekali -- bukan gap penamaan, kapasitas
 * yang memang belum (dan mungkin sengaja tidak) dibangun. RespondentProfile
 * cuma simpan data DEMOGRAFIS utk keperluan IKM (jenisKelamin/kelompokUmur/
 * pendidikan/pekerjaan), bukan identitas pribadi -- kemungkinan besar demi
 * PDP/privasi (survei memang didesain anonim, lihat keputusan arsitektur):
 *   - nik/nikMasked, phone, address -- TIDAK ADA di skema manapun.
 *   - avatarUrl -- tak ada konsep foto profil di backend.
 * Field-field ini SENGAJA null di sini, bukan dikarang.
 *
 * SSO (diperbarui 2026-08-27, celah 5): modul SSO Helpdesk SUDAH dibangun, jadi
 * `providerName` tak lagi selalu null. Yang menentukan bukan tebakan pola string
 * di sini melainkan `me.ssoLinked` dari BACKEND -- ia tahu mana `ssoSubject` yang
 * sub asli Helpdesk dan mana yang masih penampung (`seed-*`, `pending:...`).
 * Menyalin aturan itu ke sini berarti dua tempat harus mengingat hal yang sama.
 */
export function adaptMe(me) {
  // `role` tunggal DIGANTI dua nilai (5 September 2026):
  // - `roles`      : KEPEMILIKAN, dipakai menyusun pemilih peran.
  // - `actingRole` : peran yang SEDANG DIPAKAI, dan inilah yang mencerminkan
  //                  hak akses -- setiap keputusan tampilan yang meniru
  //                  penjagaan backend harus memakai nilai ini.
  //
  // Kunci `role` SENGAJA tidak dipertahankan sebagai alias: membiarkannya
  // berarti tempat-tempat yang seharusnya berpindah ke `actingRole` tetap
  // bekerja "seperti biasa" dan salahnya tak terlihat.
  const frontendRoles = (me.roles ?? []).map((r) => ROLE_TO_FRONTEND[r] ?? r);
  const frontendRole = me.actingRole
    ? (ROLE_TO_FRONTEND[me.actingRole] ?? me.actingRole)
    : null;
  return {
    id: me.id,
    name: me.nama,
    initials: getInitials(me.nama),
    email: me.email,
    phone: null, // gap, lihat catatan di atas
    nik: null, // gap
    nikMasked: null, // gap
    address: null, // gap
    occupation: me.respondentProfile?.pekerjaan ?? null,
    roles: frontendRoles,
    actingRole: frontendRole,
    roleLabel: frontendRole ? (ROLE_LABEL[frontendRole] ?? frontendRole) : null,
    // OPD tempat akun ini bertugas. Backend cuma mengirim ID-nya (MeEntity tak
    // memuat nama OPD), jadi pemanggil yang butuh namanya menyandingkan sendiri
    // lewat GET /opd/:id -- lihat AdminNavbar.jsx. `null` untuk kabupaten &
    // responden yang memang tak tertaut OPD.
    opdId: me.opdId ?? null,
    avatarUrl: null, // gap
    status: me.isActive ? 'ACTIVE' : 'INACTIVE',
    joinedAt: formatDateId(me.createdAt),
    lastLogin: me.lastLoginAt ? formatDateId(me.lastLoginAt) : null,
    sso: {
      isConnected: true, // bisa lihat halaman ini berarti sesi sudah aktif
      // Terisi HANYA bila akun benar-benar tertaut SSO. Selama masih memakai
      // dev-login, `ssoLinked` false dan kartunya jujur berbunyi "belum
      // tersambung" -- bukan mengarang nama penyedia yang tak pernah dipakai.
      providerName: me.ssoLinked ? 'SSO Helpdesk Kabupaten Madiun' : null,
      accountId: me.ssoSubject,
      // `lastLoginAt`, bukan waktu sinkronisasi tersendiri: itulah saat terakhir
      // profil ini benar-benar diperbarui dari Helpdesk (SsoService.acceptLogin
      // menyegarkan nama & waktu login pada setiap login SSO). Null bila belum
      // pernah tertaut, supaya tak terbaca sebagai sinkronisasi yang tak terjadi.
      lastSynced: me.ssoLinked && me.lastLoginAt ? formatDateId(me.lastLoginAt) : null,
      portalUrl: me.ssoLinked ? 'https://helpdesk.madiunkab.go.id' : null,
    },
  };
}
