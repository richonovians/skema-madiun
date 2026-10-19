'use strict';
const { enkripsi, dekripsi, terenkripsi } = require('./envelope.cjs');

/**
 * Logika rotasi kunci (23 September 2026).
 *
 * MENGAPA IA HARUS AMAN DIULANG. Rotasi menyentuh setiap lampiran dan setiap
 * baris terenkripsi satu per satu. Bila prosesnya mati di tengah -- listrik
 * padam, terminal tertutup, basis data putus -- sebagian data memakai kunci
 * baru dan sebagian masih kunci lama. Aplikasi hanya mengenal SATU kunci, jadi
 * separuhnya menjadi tak terbaca, dan itu keadaan yang jauh lebih buruk
 * daripada tidak merotasi sama sekali.
 *
 * Jawabannya bukan transaksi raksasa yang akan menggantung basis data,
 * melainkan bentuk yang aman diulang: untuk tiap benda, coba kunci BARU lebih
 * dulu. Terbuka berarti ia sudah dirotasi, dan dilewati. Tak terbuka berarti
 * dibuka dengan kunci LAMA lalu ditulis ulang dengan kunci baru. Menjalankan
 * skripnya kembali menuntaskan sisa yang tertinggal, dan menjalankannya pada
 * data yang sudah tuntas tak mengubah apa pun.
 *
 * MELEMPAR BILA KEDUA KUNCI GAGAL. Benda yang tak terbuka oleh kunci mana pun
 * berarti rusak, atau berasal dari kunci ketiga yang tak diketahui. Melewatinya
 * diam-diam akan meninggalkan benda tak terbaca di tengah data yang sudah
 * dirotasi, tanpa ada yang tahu sampai seseorang membukanya.
 */
function putarBlob(blob, lama, baru, info) {
  if (!terenkripsi(blob)) {
    // Berkas atau baris yang belum pernah dienkripsi sama sekali. Rotasi
    // sekaligus menuntaskan migrasi yang tertinggal, bukan melewatinya.
    return { blob: enkripsi(blob, baru, info), status: 'polos' };
  }

  try {
    dekripsi(blob, baru, info);
    return { blob, status: 'sudah' };
  } catch {
    // Bukan kunci baru. Lanjut ke kunci lama di bawah.
  }

  // Sengaja TIDAK dibungkus try: kegagalan di sini harus naik ke pemanggil dan
  // menghentikan seluruh lari.
  const isi = dekripsi(blob, lama, info);
  return { blob: enkripsi(isi, baru, info), status: 'dirotasi' };
}

module.exports = { putarBlob };
