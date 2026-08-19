import { formatDateId, getInitials } from '@/utils/format';
import { ROLE_LABEL } from '@/utils/enumLabels';

// kabupaten = superuser (2026-08-05, role superuser terpisah digabung ke kabupaten).
const ROLE_TO_FRONTEND = {
  opd: 'ADMIN_OPD',
  kabupaten: 'ADMIN_KABUPATEN',
  responden: 'RESPONDENT',
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
 *   - sso.providerName/lastSynced/portalUrl -- SSO Helpdesk NYATA belum ada
 *     (SSO-1 masih terblokir spec Helpdesk); `accountId` bisa dipetakan dari
 *     `ssoSubject` TAPI isinya cuma placeholder ("pending:<email>" atau nilai
 *     seed) selama dev-login masih dipakai, BUKAN identitas SSO sungguhan.
 * Field-field ini SENGAJA null di sini, bukan dikarang.
 */
export function adaptMe(me) {
  const frontendRole = ROLE_TO_FRONTEND[me.role] ?? me.role;
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
    role: frontendRole,
    roleLabel: ROLE_LABEL[frontendRole] ?? frontendRole,
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
      providerName: null, // gap: SSO-1 belum ada
      accountId: me.ssoSubject, // catatan: placeholder selama dev-login (SSO-1)
      lastSynced: null, // gap
      portalUrl: null, // gap
    },
  };
}
