/**
 * Template pesan percakapan pengaduan (17 September 2026, permintaan pengguna).
 *
 * Dua daftar terpisah, dan pemisahan itu bukan kerapian belaka: kalimat admin
 * berbicara atas nama instansi ("sudah kami terima", "kami teruskan"), sehingga
 * ia terbaca aneh bahkan menyesatkan bila keluar dari mulut pelapor. Satu
 * daftar bersama akan menawarkan keduanya kepada semua orang.
 *
 * DISIMPAN DI KODE, bukan basis data (pilihan pengguna). Kalimatnya jarang
 * berubah, dan menaruhnya di sini berarti tak ada tabel, endpoint, maupun
 * halaman kelola yang harus dirawat hanya untuk sebelas kalimat. Bila kelak
 * perlu disunting admin tanpa rilis, berkas ini yang menjadi bentuk awal
 * datanya -- `id` sudah disiapkan supaya perpindahan itu tak menuntut
 * pemanggilnya ikut berubah.
 */

/** Kata kunci yang diganti nomor pengaduan saat template dipakai. */
const KATA_KUNCI_TIKET = /\{tiket\}/g;

/**
 * Pengganti saat nomor tiketnya belum ada. Nomornya datang dari alamat halaman,
 * dan halaman yang belum selesai memuat belum memilikinya. Membiarkan
 * `{tiket}` lolos berarti kurung kurawal itu ikut terkirim kepada warga --
 * kalimat tanpa nomor jauh lebih baik daripada kalimat yang bocor kodenya.
 */
const TANPA_NOMOR = 'ini';

export const TEMPLATE_WARGA = [
  {
    id: 'warga-tambah-keterangan',
    judul: 'Menambahkan keterangan',
    // Berakhir dengan titik dua: ia memberi awalan, bukan kalimat jadi.
    isi: 'Saya ingin menambahkan keterangan untuk pengaduan {tiket}: ',
  },
  {
    id: 'warga-tanya-perkembangan',
    judul: 'Menanyakan perkembangan',
    isi: 'Mohon informasi perkembangan penanganan pengaduan {tiket}. Terima kasih.',
  },
  {
    id: 'warga-bukti-tambahan',
    judul: 'Mengirim bukti tambahan',
    isi: 'Saya lampirkan bukti tambahan untuk pengaduan {tiket}. Mohon diperiksa.',
  },
  {
    id: 'warga-sudah-teratasi',
    judul: 'Masalah sudah teratasi',
    isi: 'Masalah pada pengaduan {tiket} sudah teratasi. Terima kasih atas tindak lanjutnya.',
  },
  {
    id: 'warga-belum-teratasi',
    judul: 'Masalah belum teratasi',
    isi: 'Masalah pada pengaduan {tiket} masih terjadi. Mohon ditindaklanjuti kembali.',
  },
];

export const TEMPLATE_ADMIN = [
  {
    id: 'admin-diterima',
    judul: 'Pengaduan diterima',
    isi: 'Terima kasih atas laporan Anda. Pengaduan {tiket} sudah kami terima dan sedang kami periksa.',
  },
  {
    id: 'admin-minta-keterangan',
    judul: 'Meminta keterangan tambahan',
    isi: 'Untuk menindaklanjuti pengaduan {tiket}, kami membutuhkan keterangan tambahan berikut: ',
  },
  {
    id: 'admin-minta-bukti',
    judul: 'Meminta bukti pendukung',
    isi: 'Mohon lampirkan foto atau dokumen pendukung untuk pengaduan {tiket} agar dapat kami periksa lebih lanjut.',
  },
  {
    id: 'admin-diproses',
    judul: 'Sedang diproses',
    isi: 'Pengaduan {tiket} sedang kami proses. Kami akan mengabari Anda begitu ada perkembangan.',
  },
  {
    id: 'admin-diteruskan',
    judul: 'Diteruskan ke unit lain',
    isi: 'Pengaduan {tiket} kami teruskan ke unit yang berwenang menanganinya. Perkembangannya kami sampaikan lewat percakapan ini.',
  },
  {
    id: 'admin-selesai',
    judul: 'Selesai ditangani',
    isi: 'Penanganan pengaduan {tiket} telah selesai. Bila masih ada kendala, silakan balas pesan ini.',
  },
];

/**
 * Isi template dengan nomor pengaduan yang sedang dibuka.
 *
 * @param {string} isi teks template, boleh memuat `{tiket}`
 * @param {string} [nomorTiket]
 * @returns {string}
 */
export function terapkanTemplate(isi, nomorTiket) {
  const nomor = typeof nomorTiket === 'string' ? nomorTiket.trim() : '';
  return isi.replace(KATA_KUNCI_TIKET, nomor || TANPA_NOMOR);
}

/**
 * Gabungkan template dengan apa pun yang sudah diketik di kotak pesan.
 *
 * Kotak kosong diisi; kotak yang sudah berisi teks DISAMBUNG, tidak ditimpa.
 * Menimpa akan menghapus kalimat yang sedang disusun orang tanpa peringatan dan
 * tanpa jalan kembali -- kerusakan yang tak sebanding dengan kemudahan yang
 * ditawarkan fitur ini.
 *
 * @param {string} teksSekarang
 * @param {string} tambahan
 * @returns {string}
 */
export function gabungPesan(teksSekarang, tambahan) {
  const sekarang = typeof teksSekarang === 'string' ? teksSekarang : '';
  if (sekarang.trim() === '') return tambahan;
  // `trimEnd` supaya enter yang tertinggal di ujung ketikan tak menumpuk
  // menjadi baris kosong di tengah pesan.
  return `${sekarang.trimEnd()}\n${tambahan}`;
}
