import { ambilJalurKlaim } from './sso-claim-path';

/**
 * NIK, nomor HP, dan alamat pelapor dari klaim Helpdesk (1 Oktober 2026).
 *
 * KENAPA ADA. Kartu "Profil Pelapor" pada detail pengaduan sudah menggambar
 * empat baris sejak lama, tetapi tiga di antaranya selalu bertanda hubung
 * karena `complaint.adapter.js` memaku `nik`, `phone`, dan `address` ke null --
 * tak ada sumbernya di mana pun. Dua payload sungguhan dari Helpdesk akhirnya
 * diterima, dan ketiganya ADA di sana.
 *
 * DUA BENTUK, SATU PENYEDIA. Payload yang diukur berbeda bentuk menurut
 * endpoint-nya, bukan menurut tipe penggunanya:
 *
 *   GET /api/oauth/userinfo -> BERSARANG (demographics.nik, location.alamat,
 *                              identity.phone_number)
 *   GET /api/me             -> RATA      (nik, alamat, phone_number)
 *
 * Yang dipakai jalur login SKEMA adalah `userinfo`, jadi bentuk bersarang yang
 * diutamakan. Bentuk rata tetap dicoba sebagai cadangan dengan sebab yang
 * tersurat: bentuk `userinfo` untuk tipe `masyarakat` BELUM PERNAH TERLIHAT.
 * Dugaan paling wajar adalah seksinya sama dan isinya null, sebab seksi-seksi
 * itu struktural. Rantai cadangan membuat dugaan itu tak perlu dipercaya:
 * kedua bentuk yang benar-benar pernah diukur sama-sama terbaca, dan tak ada
 * env baru yang harus diisi bila ternyata yang rata yang datang.
 *
 * TIGA MEDAN SAJA, dan itu keputusan. Payload `userinfo` menyodorkan seluruh
 * seksi `demographics` sekaligus -- `kk`, `agama`, `status_perkawinan`,
 * `tempat_lahir`, `tanggal_lahir`, `kewarganegaraan` -- beserta
 * `identity.ktp_file_id` dan `identity.face_file_id` yang menunjuk dokumen
 * identitas dan data biometrik. Tak satu pun dipakai fitur mana pun di sistem
 * ini. Yang terkirim bukan alasan untuk menyimpan; yang dibutuhkan tampilan
 * itulah batasnya, dan tampilannya menggambar tepat empat baris (namanya
 * sendiri sudah ada di `users.nama`).
 *
 * `nip` SENGAJA TIDAK DIBACA. Ia nomor kepegawaian, bukan nomor kependudukan,
 * dan satu-satunya tempat kosong di kartu itu bernama NIK. Mengisi baris NIK
 * dengan NIP akan memajang angka yang salah tanpa ada yang terlihat keliru.
 */

/**
 * Rantai jalur per medan, BERSARANG DAHULU lalu rata. Urutannya bermakna:
 * jalur pertama yang menghasilkan string berisi yang dipakai.
 */
const JALUR = {
  nik: ['demographics.nik', 'nik'],
  nomorHp: ['identity.phone_number', 'phone_number'],
  alamat: ['location.alamat', 'alamat'],
} as const satisfies Record<string, readonly string[]>;

/**
 * Batas panjang, bukan penyaring bentuk. Keduanya jauh di atas bentuk yang
 * mungkin (NIK 16 digit, nomor HP paling panjang 15 digit, alamat sungguhan
 * yang diukur 84 aksara), sehingga pemotongan tak pernah mengenai data yang
 * sah. Gunanya satu: satu payload tak wajar tak dapat menumbuhkan kolom basis
 * data tanpa batas.
 */
export const BATAS_NIK = 32;
export const BATAS_NOMOR_HP = 32;
export const BATAS_ALAMAT = 255;

const BATAS = {
  nik: BATAS_NIK,
  nomorHp: BATAS_NOMOR_HP,
  alamat: BATAS_ALAMAT,
} as const;

export interface IdentitasKlaim {
  nik: string | null;
  nomorHp: string | null;
  alamat: string | null;
}

/**
 * Satu nilai klaim yang sudah dibersihkan, atau `null` bila tak terpakai.
 *
 * BUKAN STRING DITOLAK, TIDAK DIPAKSA JADI STRING. NIK yang dikirim sebagai
 * angka JSON sudah kehilangan nol di depannya sebelum fungsi ini melihatnya,
 * dan 16 digit duduk di dekat batas aman `Number`. Nomor identitas yang satu
 * digitnya berubah lebih berbahaya daripada baris yang kosong: yang kosong
 * terlihat, yang salah tidak.
 *
 * STRING KOSONG DAN SPASI SAJA DIANGGAP TIDAK ADA. Payload `/api/me`
 * sungguhan memakai `''` untuk sebagian medan dan `null` untuk sebagian lain
 * dalam satu respons; keduanya menyatakan hal yang sama dan diperlakukan sama.
 */
function bersihkan(nilai: unknown, batas: number): string | null {
  if (typeof nilai !== 'string') {
    return null;
  }
  const dipangkas = nilai.trim();
  if (dipangkas === '') {
    return null;
  }
  return dipangkas.slice(0, batas);
}

/**
 * Baca ketiga medan identitas dari klaim, apa pun bentuk payload-nya.
 *
 * TIDAK PERNAH MELEMPAR. Alasannya sama dengan `ambilJalurKlaim`: payload
 * datang dari jaringan dan dapat berbentuk apa pun. Galat di sini berarti
 * seseorang gagal masuk hanya karena penyedia mengubah bentuk satu medan
 * hiasan, padahal jalan amannya selalu tersedia yaitu menganggapnya tak ada.
 */
export function ambilIdentitasKlaim(
  klaim: Record<string, unknown> | undefined | null,
): IdentitasKlaim {
  const baca = (medan: keyof typeof JALUR): string | null => {
    for (const jalur of JALUR[medan]) {
      const hasil = bersihkan(ambilJalurKlaim(klaim, jalur), BATAS[medan]);
      if (hasil !== null) {
        return hasil;
      }
    }
    return null;
  };

  return {
    nik: baca('nik'),
    nomorHp: baca('nomorHp'),
    alamat: baca('alamat'),
  };
}
