/**
 * Pilihan saring rentang waktu pada halaman riwayat notifikasi (permintaan
 * pengguna 13 September 2026).
 *
 * KENAPA PERLU, padahal kepala kelompok tanggal sudah ada: kepala kelompok
 * hanya menata 20 baris yang sedang tampil. Saat pengguna berada di halaman 3,
 * yang muncul ya kelompok apa pun yang kebetulan jatuh di situ. Saringan ini
 * memperkecil SELURUH kumpulan -- 45 notifikasi jadi 12, tiga halaman jadi
 * satu. Pengelompokan untuk orientasi jangka pendek, saringan untuk
 * mempersempit jangka panjang.
 *
 * LABELNYA SENGAJA LEBIH KASAR daripada kepala kelompok ("Hari ini",
 * "Kemarin", "7 hari terakhir"). Kalau keduanya memakai kata yang sama,
 * menyaring ke "7 hari terakhir" akan disambut kepala kelompok bernama persis
 * sama -- membingungkan tanpa memberi apa-apa.
 */
export const RENTANG_WAKTU = [
  { value: 'semua', label: 'Semua waktu' },
  { value: '30hari', label: '30 hari terakhir' },
  { value: '3bulan', label: '3 bulan terakhir' },
  { value: 'tahunIni', label: 'Tahun ini' },
];

export const RENTANG_BAWAAN = 'semua';

/** Tengah malam pada tanggal kalender yang sama, waktu lokal peramban. */
const awalHari = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

/**
 * Mundur `n` bulan kalender dengan MENJEPIT tanggalnya ke hari terakhir bulan
 * tujuan. Tanpa penjepitan, 31 Mei mundur tiga bulan jatuh pada "31 Februari"
 * dan aritmetika Date meluber ke 3 Maret -- mempersempit rentang yang diminta
 * pengguna tanpa ada yang memberitahunya.
 */
function mundurBulan(d, n) {
  const tahun = d.getFullYear();
  const bulan = d.getMonth() - n;
  const hariTerakhir = new Date(tahun, bulan + 1, 0).getDate();
  return new Date(tahun, bulan, Math.min(d.getDate(), hariTerakhir));
}

/**
 * Batas bawah untuk satu preset, sebagai instan ISO siap kirim.
 *
 * Selalu TENGAH MALAM, bukan jam saat halaman dibuka: batas berbasis jam
 * membuang notifikasi pagi pada hari tertua padahal tanggalnya masih masuk
 * hitungan, dan membuat hasilnya berubah menurut jam berapa halaman itu dibuka.
 *
 * Tak ada preset yang memasang batas ATAS. Semuanya berakhir "sampai
 * sekarang"; memasang `to` berarti menyembunyikan notifikasi yang datang
 * sedetik sesudah halaman dimuat.
 *
 * @returns {{from?: string}} kosong bila tanpa batas.
 */
export function batasRentang(nilai, sekarang = new Date(Date.now())) {
  if (nilai === '30hari') {
    const awal = awalHari(sekarang);
    awal.setDate(awal.getDate() - 29); // hari ini + 29 hari sebelumnya = 30 tanggal
    return { from: awal.toISOString() };
  }

  if (nilai === '3bulan') {
    return { from: mundurBulan(awalHari(sekarang), 3).toISOString() };
  }

  if (nilai === 'tahunIni') {
    return { from: new Date(sekarang.getFullYear(), 0, 1).toISOString() };
  }

  // "semua" dan nilai asing mana pun: tanpa batas. Nilai asing bisa datang dari
  // keadaan lama yang tersimpan, dan ia harus menampilkan segalanya --
  // menyembunyikan semua baris jauh lebih buruk daripada mengabaikan saringan.
  return {};
}
