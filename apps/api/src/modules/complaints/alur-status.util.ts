import { ComplaintStatus } from '@prisma/client';

/**
 * Aturan alur status pengaduan — SATU TEMPAT (4 November 2026).
 *
 * Sebelum ini `ALLOWED_TRANSITIONS` tinggal di dalam `complaints.service.ts`
 * dan daftar "pengaduan belum tuntas" disalin tangan ke TIGA berkas lain
 * (`dashboard.service.ts`, `opd.service.ts`, `ikm.service.ts`) sebagai
 * `[diterima, diproses]`. Dengan empat status salinan itu masih mudah dijaga;
 * dengan tujuh ia menjadi tempat cacat yang tak akan memerah di mana pun --
 * sebuah status baru yang lupa didaftarkan hanya membuat angka di dasbor
 * diam-diam lebih kecil.
 */

/** Lima tahap alur utama, berurutan. Dipakai penanda kemajuan di antarmuka. */
export const ALUR_UTAMA: readonly ComplaintStatus[] = [
  ComplaintStatus.terkirim,
  ComplaintStatus.menunggu_verifikasi,
  ComplaintStatus.diverifikasi,
  ComplaintStatus.sedang_ditindaklanjuti,
  ComplaintStatus.selesai,
];

/** Status di luar alur utama. */
export const STATUS_ALTERNATIF: readonly ComplaintStatus[] = [
  ComplaintStatus.ditolak,
  ComplaintStatus.perlu_perbaikan,
];

/**
 * Status yang berarti "sudah tidak berjalan". Hanya dua, dan keduanya akhir.
 * Lawannya (`STATUS_BELUM_TUNTAS`) diturunkan dari daftar ini, bukan diketik
 * ulang: itulah yang membuat status baru otomatis terhitung belum tuntas
 * alih-alih menghilang dari dasbor tanpa suara.
 */
export const STATUS_TUNTAS: readonly ComplaintStatus[] = [
  ComplaintStatus.selesai,
  ComplaintStatus.ditolak,
];

export const STATUS_BELUM_TUNTAS: readonly ComplaintStatus[] = Object.values(
  ComplaintStatus,
).filter(
  (s) =>
    !STATUS_TUNTAS.includes(s) &&
    // `terkirim` tak pernah menetap di kolom `status`, jadi memasukkannya ke
    // penyaring hanya memperpanjang klausa `IN` tanpa pernah cocok.
    s !== ComplaintStatus.terkirim,
);

/**
 * Perpindahan yang diizinkan dari tiap status.
 *
 * `terkirim` kosong karena ia tak pernah menjadi status berjalan -- ia hanya
 * baris pertama riwayat. Kalau suatu saat sebuah baris benar-benar tersangkut
 * di sana, tak ada jalan keluar yang sah, dan itu lebih baik daripada
 * membiarkannya melompat ke mana saja.
 *
 * `perlu_perbaikan` BUKAN status akhir (keputusan pengguna): Admin
 * mengembalikannya ke antrean verifikasi sesudah pelapor melengkapi. Yang
 * mengembalikan Admin, bukan balasan pelapornya sendiri -- balasan masuk
 * kapan saja dan belum tentu memuat yang diminta.
 */
export const TRANSISI_DIIZINKAN: Record<ComplaintStatus, readonly ComplaintStatus[]> = {
  [ComplaintStatus.terkirim]: [],
  [ComplaintStatus.menunggu_verifikasi]: [
    ComplaintStatus.diverifikasi,
    ComplaintStatus.perlu_perbaikan,
    ComplaintStatus.ditolak,
  ],
  [ComplaintStatus.diverifikasi]: [
    ComplaintStatus.sedang_ditindaklanjuti,
    ComplaintStatus.perlu_perbaikan,
    ComplaintStatus.ditolak,
  ],
  [ComplaintStatus.sedang_ditindaklanjuti]: [
    ComplaintStatus.selesai,
    ComplaintStatus.perlu_perbaikan,
    ComplaintStatus.ditolak,
  ],
  [ComplaintStatus.perlu_perbaikan]: [ComplaintStatus.menunggu_verifikasi, ComplaintStatus.ditolak],
  [ComplaintStatus.selesai]: [],
  [ComplaintStatus.ditolak]: [],
};

/**
 * Status yang MENUNTUT catatan.
 *
 * Keduanya menyuruh pelapor melakukan sesuatu atau berhenti berharap, dan
 * tanpa kalimat penjelas ia tak tahu apa yang salah maupun apa yang kurang.
 * `ditolak` sudah mewajibkannya sejak awal; `perlu_perbaikan` ikut karena
 * tanpa catatan ia justru tak berarti apa-apa -- "lengkapi" apanya?
 */
export const STATUS_WAJIB_CATATAN: readonly ComplaintStatus[] = [
  ComplaintStatus.ditolak,
  ComplaintStatus.perlu_perbaikan,
];

/** Nama yang dibaca orang. Dipakai teks notifikasi dan pesan galat. */
export const LABEL_STATUS: Record<ComplaintStatus, string> = {
  [ComplaintStatus.terkirim]: 'Terkirim',
  [ComplaintStatus.menunggu_verifikasi]: 'Menunggu Verifikasi',
  [ComplaintStatus.diverifikasi]: 'Diverifikasi',
  [ComplaintStatus.sedang_ditindaklanjuti]: 'Sedang Ditindaklanjuti',
  [ComplaintStatus.selesai]: 'Selesai',
  [ComplaintStatus.ditolak]: 'Ditolak',
  [ComplaintStatus.perlu_perbaikan]: 'Perlu Perbaikan',
};

export function labelStatus(status: ComplaintStatus | string): string {
  return LABEL_STATUS[status as ComplaintStatus] ?? status;
}
