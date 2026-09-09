/**
 * Pilihan kelompok umur untuk pengisi survei TANPA sesi (8 September 2026).
 *
 * TIDAK ADA daftar baku sebelumnya di repo ini: `respondentProfile.kelompokUmur`
 * berupa `String` bebas tanpa `@IsIn`, dan dua fixture yang ada justru memakai
 * dua sistem rentang berbeda ('20-29' dan '26-35'). Daftar ini menetapkannya:
 * rentang sepuluh tahun mengikuti '26-35' yang sudah ada, dengan batas bawah 17
 * tahun karena pengisi survei adalah penerima layanan yang mengurus keperluannya
 * sendiri.
 *
 * Dipasang HANYA pada DTO jalur publik, bukan pada `UpdateProfileDto`, supaya
 * aturan medan yang sudah ada tidak berubah dan tak ada uji lama yang pecah.
 *
 * Kalau tim punya rentang resmi, ganti isi berkas ini dan tak ada tempat lain
 * yang perlu disentuh di backend. Padanannya di frontend ada di
 * apps/web/src/features/surveys/constants/demografi.js dan nilainya HARUS sama.
 */
export const KELOMPOK_UMUR = ['17-25', '26-35', '36-45', '46-55', '56-65', '> 65'] as const;

/**
 * Bentuk nomor HP yang diterima dari pengisi TANPA sesi (8 September 2026).
 *
 * Menerima tiga penulisan yang sama-sama lazim dipakai orang: `08xx`, `628xx`,
 * dan `+628xx`. Angka pertama sesudah `8` tak boleh nol, karena tak ada awalan
 * operator Indonesia yang berbentuk `80`.
 *
 * Nilainya disimpan APA ADANYA, tidak dinormalkan. Normalisasi baru berguna
 * kalau ada yang membandingkan atau menghubungi nomornya, dan hari ini belum
 * ada satu pun pembacanya (lihat catatan pada `survey_responses` di
 * schema.prisma). Menormalkan sekarang berarti menebak bentuk yang dibutuhkan
 * pembaca yang belum ada.
 *
 * Padanannya di frontend ada di
 * apps/web/src/features/surveys/constants/demografi.js dan HARUS sama: kalau
 * berbeda, pengisi cuma melihat formulirnya gagal terkirim tanpa sebab yang
 * jelas.
 */
export const NOMOR_HP_REGEX = /^(?:\+?62|0)8[1-9][0-9]{6,11}$/;
