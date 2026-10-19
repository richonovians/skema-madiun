import { dekripsi, enkripsi, INFO_KOLOM } from './envelope';

/**
 * Enkripsi teks untuk kolom basis data (23 September 2026).
 *
 * DIPAKAI PADA LIMA KOLOM. Dua yang pertama (23 September 2026):
 * `complaints.uraian` dan `complaint_replies.pesan` -- teks bebas yang ditulis
 * warga, dan isi paling pribadi di seluruh sistem ini, sebab di sistem
 * pengaduan ceritanya sendirilah yang sensitif, bukan metadatanya.
 *
 * Tiga berikutnya (1 Oktober 2026): `users.nik`, `users.nomor_hp`, dan
 * `users.alamat`, disalin dari klaim SSO Helpdesk untuk kartu "Profil Pelapor"
 * (lihat sso-identitas.mapper.ts). Berbeda sifat dari dua yang pertama:
 * ketiganya bukan teks bebas melainkan IDENTITAS yang menunjuk satu orang
 * secara langsung, dan NIK beserta alamat rumah adalah dua hal yang paling
 * tidak boleh ikut dalam sebuah dump yang tercecer.
 *
 * MENGAPA HANYA LIMA. Diukur, bukan dikira: kelimanya TIDAK PERNAH dicari
 * lewat `contains` di seluruh API. `users.nama` dicari (audit.service.ts), jadi
 * mengenkripsinya akan mematahkan pencarian log audit dan ia sengaja dibiarkan
 * polos -- dan itulah syarat yang memisahkan `nama` dari ketiga kolom baru di
 * sebelahnya. Akibatnya harus disebut tanpa dibaguskan: basis data ini TIDAK
 * terenkripsi seluruhnya.
 *
 * APA YANG DITUTUPNYA, DAN APA YANG TIDAK. Ini melindungi dari pihak yang
 * memperoleh AKSES BACA ke basis datanya -- `DATABASE_URL` yang bocor, sebuah
 * dump yang tercecer, sebuah cadangan yang berpindah tangan. Ia TIDAK
 * menggantikan enkripsi volume, dan enkripsi volume tak menggantikannya:
 * yang pertama melindungi disk yang dicuri, yang kedua tak melindungi apa pun
 * dari kredensial yang bocor.
 *
 * AWALAN `enc:v1:` ADA UNTUK DUA HAL. Pertama, baris lama yang masih polos
 * dikenali dan dikembalikan apa adanya, sehingga migrasi dapat bertahap dan
 * sistem tak pernah harus berhenti. Kedua, siapa pun yang membuka dump langsung
 * tahu isinya terenkripsi, bukan rusak.
 *
 * PANJANG KOLOM. Dua kolom pengaduan sudah `@db.Text` sejak awal sehingga tak
 * perlu migrasi sama sekali; ketiga kolom `users` dibuat `text` sejak lahirnya
 * dengan alasan yang sama, yaitu base64 amplop (sekitar 1,37x ditambah 49 bita
 * header) harus muat tanpa batas yang dapat menggagalkan login. Itu bukan
 * kebetulan yang menguntungkan melainkan alasan bentuk ini dipilih: `prisma
 * migrate dev` terlarang di proyek ini dan migrasinya ditulis tangan.
 */
export const AWALAN_KOLOM = 'enc:v1:';

/** Apakah nilai tersimpan sudah berbentuk blob, bukan teks polos. */
export function kolomTerenkripsi(tersimpan: string): boolean {
  return tersimpan.startsWith(AWALAN_KOLOM);
}

export function enkripsiKolom(teks: string, kunci: Buffer): string {
  // Teks kosong tetap kosong. Amplop untuk string kosong hanya menambah 49 bita
  // tanpa melindungi apa pun, dan ia membuat kolom yang tadinya kosong tampak
  // berisi -- `pesan` memang boleh kosong pada balasan yang hanya berlampiran.
  if (teks === '') {
    return '';
  }
  // Sudah terenkripsi: dikembalikan apa adanya, bukan dilapis. Skrip migrasi
  // berjalan ulang-alik, dan melapis akan menaruh `enc:v1:` di dalam `enc:v1:`
  // sehingga dekripsi satu lapis mengembalikan blob alih-alih teks.
  if (kolomTerenkripsi(teks)) {
    return teks;
  }
  const blob = enkripsi(Buffer.from(teks, 'utf8'), kunci, INFO_KOLOM);
  return AWALAN_KOLOM + blob.toString('base64url');
}

export function dekripsiKolom(tersimpan: string, kunci: Buffer): string {
  if (!kolomTerenkripsi(tersimpan)) {
    // Baris dari sebelum enkripsi dinyalakan. Dikembalikan apa adanya supaya
    // pengaduan lama tetap terbaca selama migrasi belum tuntas.
    return tersimpan;
  }
  const blob = Buffer.from(tersimpan.slice(AWALAN_KOLOM.length), 'base64url');
  return dekripsi(blob, kunci, INFO_KOLOM).toString('utf8');
}
