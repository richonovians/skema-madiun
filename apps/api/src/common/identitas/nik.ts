/**
 * Penyamaran NIK (1 Oktober 2026, permintaan pengguna: "samarkan data NIK di
 * halaman opd dan kabupaten").
 *
 * DI BACKEND, BUKAN DI TAMPILAN, dan bedanya bukan selera. NIK pada detail
 * pengaduan milik ORANG LAIN, bukan milik petugas yang membukanya. Selama
 * tampilan tak pernah menggambar nomor penuhnya, mengirimkannya ke peramban
 * petugas hanya memperbanyak tempat ia beredar: alat pengembang, ekstensi
 * peramban, singgahan respons, tangkapan layar jaringan. Di sini nomor
 * penuhnya TIDAK PERNAH meninggalkan server.
 *
 * Alasan kedua sama pentingnya: ekspor PDF pengaduan membaca medan yang SAMA.
 * Penyamaran yang ditaruh di komponen kartu akan dilewati satu klik "unduh
 * PDF", sehingga ia hanya pajangan. Penyamaran di hulu melindungi keduanya
 * tanpa pekerjaan tambahan.
 *
 * ADA PASANGANNYA DI FRONTEND, DAN ITU DISENGAJA (keputusan tersurat pengguna,
 * 1 Oktober 2026). `samarkanNik` di `apps/web` me.adapter.js menyamarkan NIK
 * pada halaman profil SENDIRI, dan di sana penyamaran memang milik tampilan:
 * nomor itu milik pemilik sesinya, jadi mengirimkannya bukan kebocoran dan
 * yang dilindungi hanyalah tatapan sekilas ke layar.
 *
 * RISIKONYA DISEBUT: aturan yang sama hidup di dua runtime dan dapat
 * menyimpang diam-diam. Keduanya WAJIB menghasilkan bentuk yang sama, dan
 * masing-masing punya ujinya sendiri yang menuliskan bentuk itu tersurat --
 * mengubah salah satu tanpa pasangannya akan memerahkan uji di sisi lain,
 * bukan lolos tanpa suara.
 *
 * YANG HILANG, DISEBUT TERANG-TERANGAN: petugas tidak akan pernah lagi dapat
 * membaca NIK penuh seorang pelapor. Bila verifikasi identitas kelak
 * membutuhkannya, itu harus menjadi kemampuan tersendiri yang meninggalkan
 * jejak audit -- bukan sesuatu yang terpampang kepada setiap petugas yang
 * kebetulan membuka halaman.
 */

/** Titik tebal, bukan tanda bintang: lebih netral & tak terbaca sebagai sensor. */
const TITIK = '•';

/** NIK sah: tepat 16 angka. */
const BENTUK_NIK = /^\d{16}$/;

/**
 * NIK tersamar, atau `null` bila tak ada.
 *
 * DUA BELAS DIGIT TENGAH ditutup, dan pilihan itu beralasan: pada NIK, segmen
 * tengah memuat sisa kode wilayah, TANGGAL LAHIR, dan nomor urut penerbitan.
 * Empat digit pertama cukup bagi petugas mengenali provinsi & kabupaten, empat
 * terakhir cukup membedakan dua pelapor yang namanya mirip.
 *
 * PANJANG YANG TAK DIKENALI DITUTUP SELURUHNYA. Helpdesk tak menjamin 16
 * digit, dan menyamarkan berdasarkan POSISI pada nilai yang panjangnya tak
 * dikenal dapat membuka justru bagian yang ingin ditutup.
 *
 * TIDAK PERNAH MELEMPAR. Ia berdiri di jalur baca pengaduan; galat di sini
 * berarti halaman detail gagal dimuat hanya karena satu medan hiasan.
 */
export function samarkanNik(nik: string | null | undefined): string | null {
  if (typeof nik !== 'string') {
    return null;
  }
  const bersih = nik.trim();
  if (bersih === '') {
    return null;
  }
  if (!BENTUK_NIK.test(bersih)) {
    return TITIK.repeat(bersih.length);
  }
  return `${bersih.slice(0, 4)} ${bersih.slice(4, 6)}${TITIK.repeat(2)} ${TITIK.repeat(4)} ${bersih.slice(12)}`;
}
