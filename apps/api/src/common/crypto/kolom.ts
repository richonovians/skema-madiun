import { dekripsi, enkripsi, INFO_KOLOM } from './envelope';

/**
 * Enkripsi teks untuk kolom basis data (23 September 2026).
 *
 * DIPAKAI PADA DUA KOLOM SAJA: `complaints.uraian` dan `complaint_replies.pesan`.
 * Keduanya teks bebas yang ditulis warga, dan keduanya isi paling pribadi di
 * seluruh sistem ini -- di sistem pengaduan, ceritanya sendirilah yang sensitif,
 * bukan metadatanya.
 *
 * MENGAPA HANYA DUA. Diukur, bukan dikira: keduanya TIDAK PERNAH dicari lewat
 * `contains` di seluruh API. `users.nama` dicari (audit.service.ts), jadi
 * mengenkripsinya akan mematahkan pencarian log audit dan ia sengaja dibiarkan
 * polos. Akibatnya harus disebut tanpa dibaguskan: basis data ini TIDAK
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
 * TIDAK ADA MIGRASI PRISMA. Kedua kolom sudah `@db.Text` tanpa batas panjang,
 * dan base64 dari amplop (sekitar 1,37x ditambah 49 bita header) muat di
 * dalamnya. Itu bukan kebetulan yang menguntungkan melainkan alasan bentuk ini
 * dipilih: `prisma migrate dev` terlarang di proyek ini.
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
