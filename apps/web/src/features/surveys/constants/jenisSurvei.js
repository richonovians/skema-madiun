/**
 * JENIS survei, satu tempat (8 Oktober 2026). Nilai-nilainya adalah enum backend
 * apa adanya (`skm_permenpanrb`, `custom`); di sini hanya label singkat untuk
 * kolom "Jenis Survei" di tabel Admin Kabupaten dan penyaring jenis di
 * Statistik & Laporan, supaya keduanya tak pernah menulis label yang berbeda.
 *
 * Label PANJANG ("SKM PermenPANRB (9 unsur terkunci)", "Survei Custom") milik
 * pemilih jenis saat membuat survei dan tetap di PemilihJenisSurvei.jsx: di sini
 * hanya yang muat di sel tabel dan opsi penyaring.
 */
export const JENIS_SURVEI = [
  { nilai: 'skm_permenpanrb', label: 'SKM' },
  { nilai: 'custom', label: 'Custom' },
];

/**
 * Label singkat sebuah jenis, atau `null` bila kosong atau tak dikenal. TIDAK
 * mengarang label: survei dari backend lama yang belum membawa `jenis` (atau
 * bernilai `umum` sebelum diganti `custom`) tampil "-" di pemanggilnya.
 */
export const labelJenis = (nilai) => JENIS_SURVEI.find((j) => j.nilai === nilai)?.label ?? null;
