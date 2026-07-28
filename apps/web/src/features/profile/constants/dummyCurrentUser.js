/**
 * dummyCurrentUser.js
 * 
 * Satu-satunya sumber data sementara untuk profil pengguna (Responden) yang sedang login
 * hingga integrasi API Backend (misalnya endpoint GET /me) selesai diimplementasikan.
 */

export const DUMMY_CURRENT_USER = {
  // Identitas Dasar
  id: 'RPD-2026-00031',
  name: 'Ahmad Fauzi',
  initials: 'AF',
  email: 'ahmad.fauzi@gmail.com',
  phone: '0812-3456-7890',
  nik: '3519012345670001',
  nikMasked: '351901234567****',
  address: 'Jl. Raya Caruban No. 45, Kec. Mejayan, Kabupaten Madiun, Jawa Timur 63153',
  occupation: 'Masyarakat Umum / Wiraswasta',
  role: 'RESPONDENT',
  roleLabel: 'Responden / Masyarakat',
  avatarUrl: null, // Jika null akan menampilkan inisial
  status: 'ACTIVE',

  // Metadata Akun
  joinedAt: '17 Januari 2026',
  lastLogin: '17 Juli 2026',

  // Informasi Koneksi SSO Helpdesk Kabupaten Madiun
  sso: {
    isConnected: true,
    providerName: 'SSO Helpdesk Kabupaten Madiun',
    accountId: 'HLP-MDU-88219',
    lastSynced: '17 Juli 2026',
    portalUrl: 'https://helpdesk.madiunkab.go.id/profile',
  },
};
