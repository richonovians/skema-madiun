const KUNCI = 'skema:draf-pengaduan';

/**
 * Medan yang boleh ikut tersimpan. Daftar putih, BUKAN daftar hitam: apa pun
 * yang kelak ditambahkan ke formulir tak akan diam-diam ikut ke penyimpanan
 * peramban hanya karena tak ada yang ingat mengecualikannya.
 *
 * `files` sengaja tak ada di sini. Objek File memang tak dapat disimpan di
 * sessionStorage, tetapi alasan sesungguhnya bukan teknis: memindahkannya ke
 * IndexedDB berarti menaruh berkas milik warga -- foto, dokumen -- di disk
 * peramban sampai ada yang menghapusnya. Di komputer bersama itu persis
 * kekhawatiran yang membuat penyimpanan terus-menerus ditolak sejak awal.
 * Layarnya karena itu WAJIB mengatakan bahwa lampirannya perlu dipilih ulang;
 * kehilangan yang diberitahukan jauh lebih baik daripada yang diam-diam.
 */
const MEDAN = ['department', 'category', 'title', 'description', 'isAnonim'];

/**
 * Draf pengaduan yang tertahan karena persetujuan PDP belum diberikan
 * (permintaan pengguna 14 September 2026).
 *
 * KENAPA sessionStorage, bukan localStorage: isi pengaduan adalah data pribadi.
 * sessionStorage ikut mati saat tabnya ditutup, sedangkan localStorage bertahan
 * di komputer bersama sampai ada yang menghapusnya. Perjalanan yang perlu
 * dilindungi pun singkat -- ke halaman persetujuan lalu kembali -- sehingga umur
 * setab sudah cukup.
 *
 * DISIMPAN HANYA saat penolakan itu terjadi, bukan pada tiap ketikan.
 */
export function simpanDrafPengaduan(formData) {
  try {
    const isi = {};
    for (const medan of MEDAN) {
      if (medan in (formData ?? {})) isi[medan] = formData[medan];
    }
    sessionStorage.setItem(KUNCI, JSON.stringify(isi));
  } catch {
    // Penyimpanan diblokir (mode privat, kebijakan situs). Draf yang gagal
    // disimpan bukan alasan menjatuhkan formulir pengaduan.
  }
}

/** @returns {object|null} `null` bila tak ada draf, atau isinya tak masuk akal. */
export function ambilDrafPengaduan() {
  try {
    const mentah = sessionStorage.getItem(KUNCI);
    if (!mentah) return null;

    const isi = JSON.parse(mentah);
    // JSON sah yang bukan objek ("teks", 42, null) tetap ditolak: isi rusak
    // diperlakukan seperti tak ada draf, bukan dituangkan mentah ke formulir.
    if (typeof isi !== 'object' || isi === null || Array.isArray(isi)) return null;
    return isi;
  } catch {
    return null;
  }
}

export function hapusDrafPengaduan() {
  try {
    sessionStorage.removeItem(KUNCI);
  } catch {
    // Sama seperti di atas: tak ada yang perlu digagalkan karena ini.
  }
}
