/**
 * Pilihan demografis untuk gerbang pengisian survei tanpa sesi
 * (8 September 2026).
 *
 * Nilainya HARUS sama dengan `KELOMPOK_UMUR` di
 * apps/api/src/modules/responses/responses.constants.ts: DTO publik di backend
 * memasang `@IsIn` pada daftar itu, jadi nilai yang tak ada di sana ditolak 400
 * dan pengisi cuma melihat formulir yang gagal terkirim tanpa sebab yang jelas.
 *
 * `laki_laki`/`perempuan` adalah nilai enum Prisma `JenisKelamin` yang sudah
 * ada (dipakai `respondent_profiles`), bukan nilai baru.
 */
export const JENIS_KELAMIN_OPSI = [
  { label: 'Laki-laki', value: 'laki_laki' },
  { label: 'Perempuan', value: 'perempuan' },
];

export const KELOMPOK_UMUR_OPSI = ['17-25', '26-35', '36-45', '46-55', '56-65', '> 65'].map(
  (rentang) => ({ label: rentang, value: rentang }),
);

/**
 * Bentuk nomor HP yang diterima. HARUS sama dengan `NOMOR_HP_REGEX` di
 * apps/api/src/modules/responses/responses.constants.ts.
 *
 * Diperiksa di frontend BUKAN sebagai pengamanan, melainkan supaya pengisi
 * membaca sebab penolakannya di sebelah medannya sendiri. Penegakan
 * sesungguhnya tetap `@Matches` pada DTO publik, yang menolak 400 pada
 * permintaan yang melompati formulir ini.
 */
export const NOMOR_HP_REGEX = /^(?:\+?62|0)8[1-9][0-9]{6,11}$/;
