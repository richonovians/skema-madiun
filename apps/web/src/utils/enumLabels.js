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

/**
 * Kunci di sini adalah status internal frontend (hasil STATUS_MAP di
 * complaint.adapter.js), nilainya kata yang dibaca orang.
 *
 * SEMUA komponen wajib mengambil katanya dari sini. Sebelum 11 September 2026
 * peta ini sudah ada namun tak satu pun komponen memakainya -- dua belas
 * komponen menyalin labelnya sendiri-sendiri, sehingga mengganti satu kata
 * berarti menyunting dua belas berkas dan berharap tak ada yang terlewat.
 */
export const COMPLAINT_STATUS_LABEL = {
  Terkirim: 'Terkirim',
  'Menunggu Verifikasi': 'Menunggu Verifikasi',
  Diverifikasi: 'Diverifikasi',
  'Sedang Ditindaklanjuti': 'Sedang Ditindaklanjuti',
  Selesai: 'Selesai',
  Ditolak: 'Ditolak',
  'Perlu Perbaikan': 'Perlu Perbaikan',
};

export const COMPLAINT_STATUS_BADGE_VARIANT = {
  // Abu-abu: peristiwa, bukan keadaan yang menunggu siapa pun.
  Terkirim: 'default',
  Diverifikasi: 'info',
  // Kuning untuk DUA keadaan yang sama-sama menunggu tindakan, dan itu
  // disengaja: yang membedakan keduanya siapa yang ditunggu, bukan seberapa
  // mendesaknya. Warna berbeda akan menyiratkan tingkatan yang tak ada.
  'Menunggu Verifikasi': 'warning',
  'Sedang Ditindaklanjuti': 'warning',
  Selesai: 'success',
  Ditolak: 'danger',
  // Jingga, bukan merah: bola ada di tangan pelapor dan tiketnya masih hidup.
  // Merah di sebelah "Ditolak" akan terbaca sebagai kembaran penolakan.
  'Perlu Perbaikan': 'secondary',
};

/**
 * Lima tahap alur utama, berurutan — pasangan `ALUR_UTAMA` di
 * `apps/api/src/modules/complaints/alur-status.util.ts`.
 *
 * DISALIN, dan itu disadari: frontend repo ini tak mengimpor apa pun dari
 * `apps/api` (lihat CLAUDE.md), jadi urutan tahap harus diketik ulang di satu
 * sisi. Yang dijaga agar tak menyimpang adalah uji komponen penanda
 * kemajuannya, bukan harapan bahwa dua berkas akan selalu disunting bersama.
 */
export const COMPLAINT_ALUR_UTAMA = [
  'Terkirim',
  'Menunggu Verifikasi',
  'Diverifikasi',
  'Sedang Ditindaklanjuti',
  'Selesai',
];

/** Status di luar alur utama; tak punya tempat pada penanda kemajuan. */
export const COMPLAINT_STATUS_ALTERNATIF = ['Ditolak', 'Perlu Perbaikan'];

export const ROLE_LABEL = {
  ADMIN_OPD: 'Admin OPD',
  ADMIN_KABUPATEN: 'Admin Kabupaten',
  RESPONDENT: 'Masyarakat',
};

/** Tabel resmi PermenPANRB 14/2017 (docs/PRD-Sistem-SKM-dan-Pengaduan-Masyarakat.md baris 388-395). */
export const IKM_MUTU_LABEL = {
  A: 'Sangat Baik',
  B: 'Baik',
  C: 'Kurang Baik',
  D: 'Tidak Baik',
};
