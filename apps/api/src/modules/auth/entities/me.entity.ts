import { ApiHideProperty } from '@nestjs/swagger';
import { JenisKelamin, Role } from '@prisma/client';
import { Exclude } from 'class-transformer';
import { BaseEntity } from '../../../common/entities/base.entity';

export class RespondentProfileView {
  jenisKelamin: JenisKelamin;
  kelompokUmur: string;
  pendidikan: string;
  pekerjaan: string;
}

/** Profil pengguna aktif (GET /auth/me). Field internal disembunyikan. */
export class MeEntity extends BaseEntity<MeEntity> {
  id: number;
  ssoSubject: string;
  nama: string;
  email: string;
  /**
   * SELURUH role yang dimiliki akun (5 September 2026). Dipakai frontend untuk
   * menyusun pemilih peran -- BUKAN untuk menyimpulkan hak akses.
   */
  roles: Role[];

  /**
   * Peran yang SEDANG DIPAKAI pada sesi ini.
   *
   * `null` berarti akun ber-role banyak yang BELUM memilih. Frontend
   * memakainya sebagai aba-aba mengarahkan ke /pilih-peran; akun ber-role
   * tunggal tak pernah bernilai null.
   */
  actingRole: Role | null;
  opdId: number | null;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  respondentProfile: RespondentProfileView | null;

  /**
   * NIK, nomor HP, & alamat dari akun Helpdesk (1 Oktober 2026).
   *
   * DIDEKLARASIKAN, dan itu bukan sekadar kerapian. `AuthService.getMe`
   * membaca baris `users` TANPA `select`, lalu `toMeEntity` menyebarnya ke
   * sini dengan `Object.assign`, sementara serialisasi entity ini EXPOSE-ALL.
   * Artinya SETIAP kolom baru pada tabel `users` ikut keluar ke klien begitu
   * kolomnya dibuat, tanpa ada yang pernah memutuskan mengirimkannya --
   * terukur tepat begitu ketiga kolom ini lahir: responsnya memuat sandi
   * mentah `enc:v1:...`. Mendeklarasikannya di sini membuat isinya
   * ditentukan `getMe` (terdekripsi), bukan diwarisi diam-diam.
   *
   * `null` berarti Helpdesk memang tak mengirimkan medan itu untuk akun ini --
   * keadaan NORMAL, sebab SSO melayani ASN maupun warga umum.
   */
  nik: string | null;
  nomorHp: string | null;
  alamat: string | null;

  /**
   * TIDAK PERNAH KELUAR, dan hanya dideklarasikan agar dapat ditahan.
   *
   * Kolom `users.jenis_kelamin` lahir pada hari yang sama dan akan ikut
   * tersebar oleh `Object.assign` persis seperti ketiga medan di atas. Tak ada
   * satu pun layar yang menggambarnya dari endpoint ini -- halaman profil tak
   * memuat baris jenis kelamin -- sehingga mengirimkannya berarti data pribadi
   * yang beredar tanpa sebab.
   */
  @Exclude()
  @ApiHideProperty()
  jenisKelamin?: JenisKelamin | null;

  /**
   * Apakah pengguna ini masih harus memberikan persetujuan PDP (celah 2,
   * 2026-08-27). Diisi AuthService.getMe lewat ConsentService.isRequired.
   *
   * BOOLEAN, bukan `consentAt`-nya: yang dibutuhkan antarmuka cuma "sudah atau
   * belum", sementara tanggal persetujuan adalah data pribadi yang tak ada
   * gunanya dikirim ke klien. Itu sebabnya `consentAt` di bawah tetap @Exclude().
   */
  consentRequired: boolean;

  /**
   * Apakah akun ini benar-benar sudah tertaut ke SSO Helpdesk (celah 5,
   * 2026-08-27), yaitu `ssoSubject`-nya sub asli — bukan nilai PENAMPUNG dari
   * masa sebelum SSO (`seed-*`, `pending:...`).
   *
   * Ditentukan di sini, bukan ditebak frontend dari pola string: bentuk
   * penampung itu detail internal basis data, dan menyalinnya ke adapter
   * frontend berarti dua tempat harus mengingat aturan yang sama.
   */
  ssoLinked: boolean;

  @Exclude()
  @ApiHideProperty()
  consentAt: Date | null;

  @Exclude()
  @ApiHideProperty()
  deletedAt: Date | null;
}
